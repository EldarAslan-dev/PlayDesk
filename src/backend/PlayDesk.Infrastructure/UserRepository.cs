using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PlayDesk.Application;
using PlayDesk.Domain;

namespace PlayDesk.Infrastructure;

public sealed class UserSecretHasher : IUserSecretHasher
{
    private readonly PasswordHasher<ApplicationUser> _hasher = new();
    public string Hash(ApplicationUser user, string password) => _hasher.HashPassword(user, password);
}

public sealed class UserRepository(PlayDeskDbContext db) : IUserRepository
{
    public Task<ApplicationUser?> FindByIdAsync(Guid id, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);
    public Task<ApplicationUser?> FindByEmailAsync(string email, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
    public Task<List<ApplicationUser>> AllAsync(CancellationToken ct) =>
        db.Users.AsNoTracking().OrderBy(x => x.Email).ToListAsync(ct);
    public void Add(ApplicationUser user) => db.Users.Add(user);
    public void AddAudit(AuditLog audit) => db.AuditLogs.Add(audit);
    public async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw AppException.Conflict("duplicate_user", "İstifadəçi artıq mövcuddur.");
        }
    }
}
