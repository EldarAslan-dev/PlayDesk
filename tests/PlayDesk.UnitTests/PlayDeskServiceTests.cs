using PlayDesk.Application;
using PlayDesk.Domain;
using Xunit;

namespace PlayDesk.UnitTests;

public sealed class PlayDeskServiceTests
{
    private readonly StubClock _clock = new(new DateTime(2026, 11, 14, 12, 0, 0, DateTimeKind.Utc));
    private readonly FakeRepository _repository = new();
    private readonly Guid _actor = Guid.NewGuid();
    private readonly Customer _customer = new() { Name = "Test customer" };
    private readonly ClubTable _table = new() { Name = "Table 02", HourlyRate = 12m };

    public PlayDeskServiceTests()
    {
        _repository.Customers.Add(_customer);
        _repository.Tables.Add(_table);
    }

    private PlayDeskService CreateService() => new(_repository, _clock, new FakeEvents());

    [Fact]
    public async Task StartSession_HasCorrectDurationPriceAndTableStatus()
    {
        var service = CreateService();
        var result = await service.CreateSessionAsync(new(_customer.Id, _table.Id, 90), _actor, default);
        Assert.Equal(18m, result.ExpectedAmount);
        Assert.Equal(_clock.UtcNow.AddMinutes(90), result.PlannedEndAtUtc);
        Assert.Equal("Active", result.Status);
        var occupied = await service.TablesAsync(false, default);
        Assert.Single(occupied);
        Assert.Equal("Occupied", occupied[0].Status);
    }

    [Fact]
    public async Task SameTableCannotStartSecondActiveSession()
    {
        var service = CreateService();
        await service.CreateSessionAsync(new(_customer.Id, _table.Id, 60), _actor, default);
        var exception = await Assert.ThrowsAsync<AppException>(() =>
            service.CreateSessionAsync(new(_customer.Id, _table.Id, 90), _actor, default));
        Assert.Equal(ErrorType.Conflict, exception.Type);
    }

    [Fact]
    public async Task ExpiredSessionRemainsOccupiedUntilPaid()
    {
        var service = CreateService();
        var session = await service.CreateSessionAsync(new(_customer.Id, _table.Id, 90), _actor, default);
        _clock.UtcNow = _clock.UtcNow.AddMinutes(95);
        var overdue = await service.TablesAsync(false, default);
        Assert.Single(overdue);
        Assert.Equal("Overdue", overdue[0].Status);
        var revenueBefore = await service.DailyRevenueAsync(BakuTime.LocalDate(_clock.UtcNow), default);
        Assert.Equal(0, revenueBefore.PaymentCount);

        var payment = await service.PayAsync(session.Id, new(PaymentMethod.Cash), _actor, default);
        Assert.Equal(18m, payment.Amount);
        Assert.Single(await service.TablesAsync(true, default));
        var revenue = await service.DailyRevenueAsync(payment.LocalPaymentDate, default);
        Assert.Equal(1, revenue.PaymentCount);
        Assert.Equal(18m, revenue.TotalRevenue);

        var exception = await Assert.ThrowsAsync<AppException>(() =>
            service.PayAsync(session.Id, new(PaymentMethod.Card), _actor, default));
        Assert.Equal("already_paid", exception.Code);
    }

    [Fact]
    public async Task RateUpdateDoesNotModifyExistingSessionAmount()
    {
        var service = CreateService();
        var session = await service.CreateSessionAsync(new(_customer.Id, _table.Id, 90), _actor, default);
        await service.ChangeRateAsync(_table.Id, new RateUpdateRequest(30m), _actor, default);
        var payment = await service.PayAsync(session.Id, new(PaymentMethod.Card), _actor, default);
        Assert.Equal(18m, payment.Amount);
    }

    private sealed class StubClock(DateTime now) : IClock
    {
        public DateTime UtcNow { get; set; } = now;
    }

    private sealed class FakeEvents : IClubEvents
    {
        public Task NotifyAsync(string eventName, object payload, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class FakeRepository : IClubRepository
    {
        public List<Customer> Customers { get; } = [];
        public List<ClubTable> Tables { get; } = [];
        public List<GameSession> Sessions { get; } = [];
        public List<Payment> Payments { get; } = [];
        private readonly List<AuditLog> _audit = [];

        public Task<Customer?> FindCustomerAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Customers.FirstOrDefault(c => c.Id == id));
        public Task<List<Customer>> SearchCustomersAsync(string? search, CancellationToken ct) =>
            Task.FromResult(Customers.Where(c => search is null || c.Name.Contains(search)).ToList());
        public Task<ClubTable?> FindTableAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Tables.FirstOrDefault(t => t.Id == id));
        public Task<ClubTable?> FindTableWithActiveSessionsAsync(Guid id, CancellationToken ct) => FindTableAsync(id, ct);
        public Task<List<ClubTable>> ListTablesAsync(CancellationToken ct) => Task.FromResult(Tables);
        public Task<GameSession?> FindSessionAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(Sessions.FirstOrDefault(s => s.Id == id));
        public Task<List<GameSession>> ListSessionsAsync(bool? activeOnly, CancellationToken ct) =>
            Task.FromResult(Sessions.Where(s => activeOnly is null || (s.ClosedAtUtc is null) == activeOnly.Value).ToList());
        public Task<List<RevenueRow>> RevenueByDayAsync(DateOnly from, DateOnly to, CancellationToken ct) =>
            Task.FromResult(Payments.Where(p => p.LocalPaymentDate >= from && p.LocalPaymentDate <= to)
                .GroupBy(p => p.LocalPaymentDate)
                .Select(g => new RevenueRow(g.Key, g.Count(), g.Sum(p => p.Amount))).ToList());
        public void AddCustomer(Customer customer) => Customers.Add(customer);
        public void AddSession(GameSession session)
        {
            Sessions.Add(session);
            session.ClubTable.Sessions.Add(session);
        }
        public void AddPayment(Payment payment)
        {
            Payments.Add(payment);
            var session = Sessions.Single(s => s.Id == payment.GameSessionId);
            session.Payment = payment;
            payment.GameSession = session;
        }
        public void AddAudit(AuditLog audit) => _audit.Add(audit);
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }
}
