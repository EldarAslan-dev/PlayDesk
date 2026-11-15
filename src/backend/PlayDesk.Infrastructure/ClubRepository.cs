using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PlayDesk.Application;
using PlayDesk.Domain;

namespace PlayDesk.Infrastructure;

public sealed class ClubRepository(PlayDeskDbContext db) : IClubRepository
{
    public Task<Customer?> FindCustomerAsync(Guid id, CancellationToken ct) =>
        db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<Customer>> SearchCustomersAsync(string? search, CancellationToken ct)
    {
        var query = db.Customers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Name.Contains(search));
        return query.OrderBy(x => x.Name).Take(100).ToListAsync(ct);
    }

    public Task<ClubTable?> FindTableAsync(Guid id, CancellationToken ct) =>
        db.ClubTables.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ClubTable?> FindTableWithActiveSessionsAsync(Guid id, CancellationToken ct) =>
        db.ClubTables.Include(x => x.Sessions.Where(s => s.ClosedAtUtc == null))
            .ThenInclude(s => s.Customer).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ClubTable>> ListTablesAsync(CancellationToken ct) =>
        db.ClubTables.AsNoTracking().AsSplitQuery()
            .Include(x => x.Sessions.Where(s => s.ClosedAtUtc == null))
            .ThenInclude(s => s.Customer).OrderBy(x => x.Name).ToListAsync(ct);

    public Task<GameSession?> FindSessionAsync(Guid id, CancellationToken ct) =>
        db.GameSessions.Include(x => x.Customer).Include(x => x.ClubTable)
            .Include(x => x.Payment).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<GameSession>> ListSessionsAsync(bool? activeOnly, CancellationToken ct)
    {
        var query = db.GameSessions.AsNoTracking()
            .Include(x => x.Customer).Include(x => x.ClubTable).Include(x => x.Payment).AsQueryable();
        if (activeOnly is true) query = query.Where(x => x.ClosedAtUtc == null);
        if (activeOnly is false) query = query.Where(x => x.ClosedAtUtc != null);
        return query.OrderByDescending(x => x.StartedAtUtc).Take(200).ToListAsync(ct);
    }

    public async Task<List<RevenueRow>> RevenueByDayAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken ct)
    {
        var rows = await db.Payments
            .AsNoTracking()
            .Where(p =>
                p.LocalPaymentDate >= from &&
                p.LocalPaymentDate <= to)
            .GroupBy(p => p.LocalPaymentDate)
            .Select(g => new
            {
                Date = g.Key,
                PaymentCount = g.Count(),
                TotalRevenue = g.Sum(p => p.Amount)
            })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);

        return rows
            .Select(x => new RevenueRow(
                x.Date,
                x.PaymentCount,
                x.TotalRevenue))
            .ToList();
    }

    public void AddCustomer(Customer value) => db.Customers.Add(value);
    public void AddSession(GameSession value) => db.GameSessions.Add(value);
    public void AddPayment(Payment value) => db.Payments.Add(value);
    public void AddAudit(AuditLog value) => db.AuditLogs.Add(value);

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw AppException.Conflict("concurrent_update", "Məlumat başqa operator tərəfindən dəyişdirilib. Yenidən yoxlayın.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw AppException.Conflict("duplicate_operation", "Masa artıq məşğuldur və ya ödəniş artıq qeydə alınıb.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 547 })
        {
            throw AppException.Conflict("invalid_relation", "Əlaqəli məlumat artıq mövcud deyil və ya məlumat məhdudiyyəti pozulub.");
        }
    }
}
