namespace PlayDesk.Domain;

public sealed class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public ICollection<GameSession> Sessions { get; set; } = new List<GameSession>();
}

public sealed class ClubTable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public decimal HourlyRate { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public ICollection<GameSession> Sessions { get; set; } = new List<GameSession>();
}

public sealed class GameSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid ClubTableId { get; set; }
    public ClubTable ClubTable { get; set; } = null!;
    public DateTime StartedAtUtc { get; set; }
    public DateTime PlannedEndAtUtc { get; set; }
    public int DurationMinutes { get; set; }
    public decimal HourlyRateSnapshot { get; set; }
    public decimal ExpectedAmount { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public Payment? Payment { get; set; }
}

public enum PaymentMethod { Cash, Card }

public sealed class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameSessionId { get; set; }
    public GameSession GameSession { get; set; } = null!;
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public DateTime PaidAtUtc { get; set; }
    public DateOnly LocalPaymentDate { get; set; }
    public Guid ReceivedByUserId { get; set; }
    public ApplicationUser ReceivedBy { get; set; } = null!;
}

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Operator = "Operator";
}

public sealed class ApplicationUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = AppRoles.Operator;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? ActorUserId { get; set; }
    public ApplicationUser? Actor { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? DataJson { get; set; }
    public DateTime OccurredAtUtc { get; set; }
}
