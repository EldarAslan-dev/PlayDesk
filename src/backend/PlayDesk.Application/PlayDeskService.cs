using System.Text.Json;
using PlayDesk.Domain;

namespace PlayDesk.Application;

public sealed class PlayDeskService(IClubRepository repository, IClock clock, IClubEvents events) : IPlayDeskService
{
    public async Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
            throw AppException.Validation("invalid_customer_name", "Müştəri adı 1–120 simvol olmalıdır.");
        var customer = new Customer { Name = name, CreatedAtUtc = clock.UtcNow };
        repository.AddCustomer(customer);
        await repository.SaveChangesAsync(ct);
        return new(customer.Id, customer.Name, customer.CreatedAtUtc);
    }

    public async Task<CustomerDto> CustomerAsync(Guid id, CancellationToken ct)
    {
        var customer = await repository.FindCustomerAsync(id, ct)
            ?? throw AppException.NotFound("customer_not_found", "Müştəri tapılmadı.");
        return new(customer.Id, customer.Name, customer.CreatedAtUtc);
    }

    public async Task<IReadOnlyList<CustomerDto>> CustomersAsync(string? search, CancellationToken ct) =>
        (await repository.SearchCustomersAsync(search?.Trim(), ct))
        .Select(c => new CustomerDto(c.Id, c.Name, c.CreatedAtUtc)).ToList();

    public async Task<IReadOnlyList<TableDto>> TablesAsync(bool? isAvailable, CancellationToken ct)
    {
        var tables = (await repository.ListTablesAsync(ct)).Select(MapTable).ToList();
        return isAvailable is null ? tables : tables.Where(t => isAvailable.Value
            ? t.Status == "Available" : t.Status is "Occupied" or "Overdue").ToList();
    }

    public async Task<SessionDto> CreateSessionAsync(CreateSessionRequest request, Guid actorId, CancellationToken ct)
    {
        Pricing.Calculate(1m, request.DurationMinutes); // enforce duration before any query
        var customer = await repository.FindCustomerAsync(request.CustomerId, ct)
            ?? throw AppException.NotFound("customer_not_found", "Müştəri tapılmadı.");
        var table = await repository.FindTableWithActiveSessionsAsync(request.TableId, ct)
            ?? throw AppException.NotFound("table_not_found", "Masa tapılmadı.");
        if (!table.IsEnabled) throw AppException.Conflict("table_disabled", "Masa texniki xidmətdədir.");
        if (table.Sessions.Any(s => s.ClosedAtUtc is null))
            throw AppException.Conflict("table_busy", "Masa artıq məşğuldur.");

        var now = clock.UtcNow;
        var session = new GameSession
        {
            CustomerId = customer.Id, Customer = customer,
            ClubTableId = table.Id, ClubTable = table,
            StartedAtUtc = now, PlannedEndAtUtc = now.AddMinutes(request.DurationMinutes),
            DurationMinutes = request.DurationMinutes, HourlyRateSnapshot = table.HourlyRate,
            ExpectedAmount = Pricing.Calculate(table.HourlyRate, request.DurationMinutes)
        };
        repository.AddSession(session);
        Audit("SessionStarted", "GameSession", session.Id, actorId,
            new
            {
                TableId = table.Id,
                CustomerId = customer.Id,
                request.DurationMinutes
            });
        await repository.SaveChangesAsync(ct);
        await events.NotifyAsync("SessionStarted", new { session.Id, tableId = table.Id }, ct);
        return MapSession(session);
    }

    public async Task<SessionDto> SessionAsync(Guid id, CancellationToken ct)
    {
        var session = await repository.FindSessionAsync(id, ct)
            ?? throw AppException.NotFound("session_not_found", "Sessiya tapılmadı.");
        return MapSession(session);
    }

    public async Task<IReadOnlyList<SessionDto>> SessionsAsync(bool? activeOnly, CancellationToken ct) =>
        (await repository.ListSessionsAsync(activeOnly, ct)).Select(MapSession).ToList();

    public async Task<PaymentDto> PayAsync(Guid sessionId, PaymentRequest request, Guid actorId, CancellationToken ct)
    {
        if (!Enum.IsDefined(request.Method))
            throw AppException.Validation("invalid_payment_method", "Ödəniş üsulu yanlışdır.");
        var session = await repository.FindSessionAsync(sessionId, ct)
            ?? throw AppException.NotFound("session_not_found", "Sessiya tapılmadı.");
        if (session.ClosedAtUtc is not null || session.Payment is not null)
            throw AppException.Conflict("already_paid", "Bu sessiya üzrə ödəniş artıq qeydə alınıb.");
        var now = clock.UtcNow;
        var payment = new Payment
        {
            GameSessionId = session.Id, Amount = session.ExpectedAmount,
            PaidAtUtc = now, LocalPaymentDate = BakuTime.LocalDate(now),
            Method = request.Method, ReceivedByUserId = actorId
        };
        session.ClosedAtUtc = now;
        repository.AddPayment(payment);
        Audit("PaymentRecorded", "GameSession", session.Id, actorId, new { payment.Id, payment.Amount });
        // A single SaveChanges uses EF Core's atomic transaction for payment, close and audit.
        await repository.SaveChangesAsync(ct);
        await events.NotifyAsync("PaymentRecorded", new { sessionId, tableId = session.ClubTableId, amount = payment.Amount }, ct);
        await events.NotifyAsync("SessionClosed", new { sessionId, tableId = session.ClubTableId }, ct);
        return MapPayment(payment);
    }

    public async Task<TableDto> ChangeRateAsync(Guid tableId, RateUpdateRequest request, Guid actorId, CancellationToken ct)
    {
        if (request.HourlyRate <= 0 || request.HourlyRate > 10000m || decimal.Round(request.HourlyRate, 2) != request.HourlyRate)
            throw AppException.Validation("invalid_rate", "Tarif 0–10000 AZN aralığında, maksimum 2 onluqla olmalıdır.");
        var table = await repository.FindTableWithActiveSessionsAsync(tableId, ct)
            ?? throw AppException.NotFound("table_not_found", "Masa tapılmadı.");
        table.HourlyRate = request.HourlyRate;
        Audit("TableRateChanged", "ClubTable", table.Id, actorId, new { request.HourlyRate });
        await repository.SaveChangesAsync(ct);
        await events.NotifyAsync("TableUpdated", new { tableId }, ct);
        return MapTable(table);
    }

    public async Task<TableDto> ChangeAvailabilityAsync(Guid tableId, AvailabilityUpdateRequest request, Guid actorId, CancellationToken ct)
    {
        var table = await repository.FindTableWithActiveSessionsAsync(tableId, ct)
            ?? throw AppException.NotFound("table_not_found", "Masa tapılmadı.");
        if (!request.IsEnabled && table.Sessions.Any(s => s.ClosedAtUtc is null))
            throw AppException.Conflict("table_busy", "Aktiv sessiyası olan masa deaktiv edilə bilməz.");
        table.IsEnabled = request.IsEnabled;
        Audit("TableAvailabilityChanged", "ClubTable", table.Id, actorId, new { request.IsEnabled });
        await repository.SaveChangesAsync(ct);
        await events.NotifyAsync("TableUpdated", new { tableId }, ct);
        return MapTable(table);
    }

    public async Task<RevenueDayDto> DailyRevenueAsync(DateOnly date, CancellationToken ct)
    {
        var rows = await repository.RevenueByDayAsync(date, date, ct);
        var row = rows.FirstOrDefault();
        return row is null ? new(date, 0, 0m) : new(date, row.PaymentCount, row.TotalRevenue);
    }

    public async Task<RevenueReportDto> RevenueAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 92)
            throw AppException.Validation("invalid_date_range", "Tarix aralığı 1–93 gün olmalıdır.");
        var rows = (await repository.RevenueByDayAsync(from, to, ct)).ToDictionary(x => x.Date);
        var days = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(i => from.AddDays(i))
            .Select(d => rows.TryGetValue(d, out var row)
                ? new RevenueDayDto(d, row.PaymentCount, row.TotalRevenue)
                : new RevenueDayDto(d, 0, 0m)).ToList();
        return new(from, to, days.Sum(d => d.PaymentCount), days.Sum(d => d.TotalRevenue), days);
    }

    public async Task<DashboardDto> DashboardAsync(CancellationToken ct)
    {
        var tables = await TablesAsync(null, ct);
        var today = await DailyRevenueAsync(BakuTime.LocalDate(clock.UtcNow), ct);
        var active = tables.Count(t => t.Status is "Occupied" or "Overdue");
        return new(tables.Count, tables.Count(t => t.Status == "Available"),
            tables.Count(t => t.Status == "Occupied"), tables.Count(t => t.Status == "Overdue"),
            today.TotalRevenue, today.PaymentCount, active);
    }

    private TableDto MapTable(ClubTable table)
    {
        var active = table.Sessions.FirstOrDefault(s => s.ClosedAtUtc is null);
        var status = active is not null
            ? (active.PlannedEndAtUtc <= clock.UtcNow ? "Overdue" : "Occupied")
            : (table.IsEnabled ? "Available" : "Maintenance");
        return new(table.Id, table.Name, table.HourlyRate, table.IsEnabled, status,
            active is null ? null : new ActiveSessionDto(active.Id,
                active.Customer?.Name ?? string.Empty, active.StartedAtUtc,
                active.PlannedEndAtUtc, active.DurationMinutes, active.ExpectedAmount));
    }

    private SessionDto MapSession(GameSession session)
    {
        var status = session.ClosedAtUtc is not null ? "Completed"
            : session.PlannedEndAtUtc <= clock.UtcNow ? "Overdue" : "Active";
        return new(session.Id, session.CustomerId, session.Customer.Name,
            session.ClubTableId, session.ClubTable.Name,
            session.StartedAtUtc, session.PlannedEndAtUtc, session.DurationMinutes,
            session.HourlyRateSnapshot, session.ExpectedAmount, session.ClosedAtUtc,
            status, session.Payment is not null, session.Payment is null ? null : MapPayment(session.Payment));
    }

    private static PaymentDto MapPayment(Payment payment) =>
        new(payment.Id, payment.GameSessionId, payment.Amount,
            payment.Method.ToString(), payment.PaidAtUtc, payment.LocalPaymentDate);

    private void Audit(string action, string entityType, Guid entityId, Guid actor, object data) =>
        repository.AddAudit(new AuditLog { ActorUserId = actor, Action = action,
            EntityType = entityType, EntityId = entityId.ToString(),
            DataJson = JsonSerializer.Serialize(data), OccurredAtUtc = clock.UtcNow });
}
