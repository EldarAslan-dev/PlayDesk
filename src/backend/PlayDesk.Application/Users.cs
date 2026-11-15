using System.Net.Mail;
using PlayDesk.Domain;

namespace PlayDesk.Application;

public sealed record ManagedUserDto(Guid Id, string Email, string Role, bool IsActive, DateTime CreatedAtUtc);
public sealed record CreateManagedUserRequest(string Email, string Password, string Role);
public sealed record ChangeUserActiveRequest(bool IsActive);

public interface IUserRepository
{
    Task<ApplicationUser?> FindByIdAsync(Guid id, CancellationToken ct);
    Task<ApplicationUser?> FindByEmailAsync(string email, CancellationToken ct);
    Task<List<ApplicationUser>> AllAsync(CancellationToken ct);
    void Add(ApplicationUser user);
    void AddAudit(AuditLog audit);
    Task SaveAsync(CancellationToken ct);
}
public interface IUserSecretHasher { string Hash(ApplicationUser user, string password); }
public interface IUserManagementService
{
    Task<IReadOnlyList<ManagedUserDto>> AllAsync(CancellationToken ct);
    Task<ManagedUserDto> GetAsync(Guid id, CancellationToken ct);
    Task<ManagedUserDto> CreateAsync(CreateManagedUserRequest request, Guid actorId, CancellationToken ct);
    Task<ManagedUserDto> SetActiveAsync(Guid userId, ChangeUserActiveRequest request, Guid actorId, CancellationToken ct);
}

public sealed class UserManagementService(IUserRepository repository, IUserSecretHasher hasher,
    IClock clock) : IUserManagementService
{
    private static ManagedUserDto Map(ApplicationUser u) => new(u.Id, u.Email, u.Role, u.IsActive, u.CreatedAtUtc);
    public async Task<IReadOnlyList<ManagedUserDto>> AllAsync(CancellationToken ct) =>
        (await repository.AllAsync(ct)).Select(Map).ToList();

    public async Task<ManagedUserDto> GetAsync(Guid id, CancellationToken ct) =>
        Map(await repository.FindByIdAsync(id, ct) ??
            throw AppException.NotFound("user_not_found", "İstifadəçi tapılmadı."));

    public async Task<ManagedUserDto> CreateAsync(CreateManagedUserRequest request, Guid actorId, CancellationToken ct)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? "";
        if (!MailAddress.TryCreate(email, out var parsed) || parsed.Address != email || email.Length > 254)
            throw AppException.Validation("invalid_email", "Düzgün email daxil edin.");
        if (request.Password is null || request.Password.Length < 12 || request.Password.Length > 128)
            throw AppException.Validation("weak_password", "Şifrə 12–128 simvol olmalıdır.");
        if (request.Role is not (AppRoles.Admin or AppRoles.Operator))
            throw AppException.Validation("invalid_role", "Rol Admin və ya Operator olmalıdır.");
        if (await repository.FindByEmailAsync(email, ct) is not null)
            throw AppException.Conflict("email_exists", "Bu email artıq qeydiyyatdadır.");
        var user = new ApplicationUser { Email = email, Role = request.Role, CreatedAtUtc = clock.UtcNow };
        user.PasswordHash = hasher.Hash(user, request.Password);
        repository.Add(user);
        Audit(actorId, "UserCreated", user.Id);
        await repository.SaveAsync(ct);
        return Map(user);
    }

    public async Task<ManagedUserDto> SetActiveAsync(Guid userId, ChangeUserActiveRequest request, Guid actorId, CancellationToken ct)
    {
        if (userId == actorId && !request.IsActive)
            throw AppException.Conflict("cannot_disable_self", "Öz hesabınızı deaktiv edə bilməzsiniz.");
        var user = await repository.FindByIdAsync(userId, ct)
            ?? throw AppException.NotFound("user_not_found", "İstifadəçi tapılmadı.");
        user.IsActive = request.IsActive;
        Audit(actorId, request.IsActive ? "UserEnabled" : "UserDisabled", userId);
        await repository.SaveAsync(ct);
        return Map(user);
    }

    private void Audit(Guid actor, string action, Guid entityId) => repository.AddAudit(new AuditLog
    {
        ActorUserId = actor, EntityType = "ApplicationUser", EntityId = entityId.ToString(),
        Action = action, OccurredAtUtc = clock.UtcNow
    });
}
