using Microsoft.EntityFrameworkCore;
using PlayDesk.Domain;

namespace PlayDesk.Infrastructure;

public sealed class PlayDeskDbContext(DbContextOptions<PlayDeskDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ClubTable> ClubTables => Set<ClubTable>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ApplicationUser> Users => Set<ApplicationUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(b =>
        {
            b.ToTable("Customers"); b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(120);
            b.Property(x => x.CreatedAtUtc).IsRequired();
        });
        modelBuilder.Entity<ClubTable>(b =>
        {
            b.ToTable("ClubTables"); b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(80);
            b.HasIndex(x => x.Name).IsUnique();
            b.Property(x => x.HourlyRate).HasColumnType("decimal(18,2)");
            b.Property(x => x.RowVersion).IsRowVersion();
            b.ToTable(t => t.HasCheckConstraint("CK_ClubTables_HourlyRate", "[HourlyRate] > 0"));
        });
        modelBuilder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("ApplicationUsers"); b.HasKey(x => x.Id);
            b.Property(x => x.Email).IsRequired().HasMaxLength(254);
            b.HasIndex(x => x.Email).IsUnique();
            b.Property(x => x.PasswordHash).IsRequired().HasMaxLength(1024);
            b.Property(x => x.Role).IsRequired().HasMaxLength(30);
        });
        modelBuilder.Entity<GameSession>(b =>
        {
            b.ToTable("GameSessions"); b.HasKey(x => x.Id);
            b.HasOne(x => x.Customer).WithMany(x => x.Sessions).HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ClubTable).WithMany(x => x.Sessions).HasForeignKey(x => x.ClubTableId).OnDelete(DeleteBehavior.Restrict);
            b.Property(x => x.HourlyRateSnapshot).HasColumnType("decimal(18,2)");
            b.Property(x => x.ExpectedAmount).HasColumnType("decimal(18,2)");
            b.Property(x => x.RowVersion).IsRowVersion();
            b.HasIndex(x => x.ClubTableId).IsUnique().HasDatabaseName("UX_GameSessions_ActiveTable")
                .HasFilter("[ClosedAtUtc] IS NULL");
            b.HasIndex(x => x.CustomerId);
            b.ToTable(t => t.HasCheckConstraint("CK_GameSessions_Duration",
                "[DurationMinutes] BETWEEN 30 AND 1440 AND [DurationMinutes] % 30 = 0"));
        });
        modelBuilder.Entity<Payment>(b =>
        {
            b.ToTable("Payments"); b.HasKey(x => x.Id);
            b.HasOne(x => x.GameSession).WithOne(x => x.Payment).HasForeignKey<Payment>(x => x.GameSessionId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.ReceivedBy).WithMany().HasForeignKey(x => x.ReceivedByUserId).OnDelete(DeleteBehavior.Restrict);
            b.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            b.Property(x => x.Method).HasConversion<string>().HasMaxLength(20);
            b.Property(x => x.LocalPaymentDate).HasColumnType("date");
            b.HasIndex(x => x.GameSessionId).IsUnique();
            b.HasIndex(x => x.LocalPaymentDate);
            b.HasIndex(x => x.PaidAtUtc);
            b.ToTable(t => t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0"));
        });
        modelBuilder.Entity<AuditLog>(b =>
        {
            b.ToTable("AuditLogs"); b.HasKey(x => x.Id);
            b.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorUserId).OnDelete(DeleteBehavior.Restrict);
            b.Property(x => x.Action).HasMaxLength(80).IsRequired();
            b.Property(x => x.EntityType).HasMaxLength(80).IsRequired();
            b.Property(x => x.EntityId).HasMaxLength(80).IsRequired();
            b.Property(x => x.DataJson).HasMaxLength(4000);
            b.HasIndex(x => x.OccurredAtUtc);
        });
    }
}
