using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlayDesk.Domain;

namespace PlayDesk.Infrastructure;

public static class DbSeeder
{
    public static async Task SeedAsync(PlayDeskDbContext db, IConfiguration config, ILogger logger,
        CancellationToken ct = default)
    {
        if (!await db.ClubTables.AnyAsync(ct))
        {
            var now = DateTime.UtcNow;
            db.ClubTables.AddRange(
                new ClubTable { Name = "Table 01", HourlyRate = 8m, CreatedAtUtc = now },
                new ClubTable { Name = "Table 02", HourlyRate = 12m, CreatedAtUtc = now },
                new ClubTable { Name = "Table 03", HourlyRate = 16m, CreatedAtUtc = now });
        }

        var email = config["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = config["Seed:AdminPassword"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            if (password.Length < 12) throw new InvalidOperationException("Seed:AdminPassword 12 simvoldan qısa ola bilməz.");
            if (!await db.Users.AnyAsync(x => x.Email == email, ct))
            {
                var user = new ApplicationUser { Email = email, Role = AppRoles.Admin, CreatedAtUtc = DateTime.UtcNow };
                user.PasswordHash = new PasswordHasher<ApplicationUser>().HashPassword(user, password);
                db.Users.Add(user);
                logger.LogInformation("Initial administrator created: {Email}", email);
            }
        }
        else if (!await db.Users.AnyAsync(ct))
        {
            logger.LogWarning("No users exist. Configure Seed:AdminEmail and Seed:AdminPassword (environment or user-secrets).");
        }
        await db.SaveChangesAsync(ct);
    }
}
