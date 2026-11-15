using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PlayDesk.Infrastructure;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<PlayDeskDbContext>
{
    public PlayDeskDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? @"Server=(localdb)\mssqllocaldb;Database=PlayDeskDb;Trusted_Connection=True;TrustServerCertificate=True";
        var options = new DbContextOptionsBuilder<PlayDeskDbContext>()
            .UseSqlServer(connection).Options;
        return new PlayDeskDbContext(options);
    }
}
