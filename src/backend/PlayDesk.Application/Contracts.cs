using PlayDesk.Domain;

namespace PlayDesk.Application;

public sealed record CreateCustomerRequest(string Name);
public sealed record CustomerDto(Guid Id, string Name, DateTime CreatedAtUtc);
public sealed record CreateSessionRequest(Guid CustomerId, Guid TableId, int DurationMinutes);
public sealed record ActiveSessionDto(Guid Id, string CustomerName, DateTime StartedAtUtc,
    DateTime PlannedEndAtUtc, int DurationMinutes, decimal ExpectedAmount);
public sealed record TableDto(Guid Id, string Name, decimal HourlyRate, bool IsEnabled,
    string Status, ActiveSessionDto? ActiveSession);
public sealed record SessionDto(Guid Id, Guid CustomerId, string CustomerName, Guid TableId,
    string TableName, DateTime StartedAtUtc, DateTime PlannedEndAtUtc, int DurationMinutes,
    decimal HourlyRateSnapshot, decimal ExpectedAmount, DateTime? ClosedAtUtc, string Status,
    bool IsPaid, PaymentDto? Payment);
public sealed record PaymentRequest(PaymentMethod Method);
public sealed record PaymentDto(Guid Id, Guid GameSessionId, decimal Amount, string Method,
    DateTime PaidAtUtc, DateOnly LocalPaymentDate);
public sealed record RateUpdateRequest(decimal HourlyRate);
public sealed record AvailabilityUpdateRequest(bool IsEnabled);
public sealed record RevenueDayDto(DateOnly Date, int PaymentCount, decimal TotalRevenue);
public sealed record RevenueReportDto(DateOnly From, DateOnly To, int PaymentCount,
    decimal TotalRevenue, IReadOnlyList<RevenueDayDto> Days);
public sealed record DashboardDto(int TotalTables, int AvailableTables, int OccupiedTables,
    int OverdueTables, decimal TodayRevenue, int TodayPayments, int ActiveSessions);
public sealed record RevenueRow(DateOnly Date, int PaymentCount, decimal TotalRevenue);

public enum ErrorType { Validation, NotFound, Conflict }
public sealed class AppException(ErrorType type, string code, string message) : Exception(message)
{
    public ErrorType Type { get; } = type;
    public string Code { get; } = code;
    public static AppException Validation(string code, string message) => new(ErrorType.Validation, code, message);
    public static AppException NotFound(string code, string message) => new(ErrorType.NotFound, code, message);
    public static AppException Conflict(string code, string message) => new(ErrorType.Conflict, code, message);
}

public interface IClock { DateTime UtcNow { get; } }
public interface IClubRepository
{
    Task<Customer?> FindCustomerAsync(Guid id, CancellationToken cancellationToken);
    Task<List<Customer>> SearchCustomersAsync(string? search, CancellationToken cancellationToken);
    Task<ClubTable?> FindTableAsync(Guid id, CancellationToken cancellationToken);
    Task<ClubTable?> FindTableWithActiveSessionsAsync(Guid id, CancellationToken cancellationToken);
    Task<List<ClubTable>> ListTablesAsync(CancellationToken cancellationToken);
    Task<GameSession?> FindSessionAsync(Guid id, CancellationToken cancellationToken);
    Task<List<GameSession>> ListSessionsAsync(bool? activeOnly, CancellationToken cancellationToken);
    Task<List<RevenueRow>> RevenueByDayAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);
    void AddCustomer(Customer customer);
    void AddSession(GameSession session);
    void AddPayment(Payment payment);
    void AddAudit(AuditLog audit);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
public interface IClubEvents
{
    Task NotifyAsync(string eventName, object payload, CancellationToken cancellationToken);
}
public interface IPlayDeskService
{
    Task<CustomerDto> CreateCustomerAsync(CreateCustomerRequest request, CancellationToken cancellationToken);
    Task<CustomerDto> CustomerAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<CustomerDto>> CustomersAsync(string? search, CancellationToken cancellationToken);
    Task<IReadOnlyList<TableDto>> TablesAsync(bool? isAvailable, CancellationToken cancellationToken);
    Task<SessionDto> CreateSessionAsync(CreateSessionRequest request, Guid actorId, CancellationToken cancellationToken);
    Task<SessionDto> SessionAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<SessionDto>> SessionsAsync(bool? activeOnly, CancellationToken cancellationToken);
    Task<PaymentDto> PayAsync(Guid sessionId, PaymentRequest request, Guid actorId, CancellationToken cancellationToken);
    Task<TableDto> ChangeRateAsync(Guid tableId, RateUpdateRequest request, Guid actorId, CancellationToken cancellationToken);
    Task<TableDto> ChangeAvailabilityAsync(Guid tableId, AvailabilityUpdateRequest request, Guid actorId, CancellationToken cancellationToken);
    Task<RevenueDayDto> DailyRevenueAsync(DateOnly date, CancellationToken cancellationToken);
    Task<RevenueReportDto> RevenueAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);
    Task<DashboardDto> DashboardAsync(CancellationToken cancellationToken);
}
