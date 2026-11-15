using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PlayDesk.Domain;
using PlayDesk.Infrastructure;

namespace PlayDesk.API.Controllers;

public sealed record AuditDto(Guid Id, string Action, string EntityType, string EntityId,
    DateTime OccurredAtUtc, string? ActorEmail, string? DataJson);

[ApiController, Authorize(Roles = AppRoles.Admin), Route("api/audit")]
public sealed class AuditController(PlayDeskDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditDto>>> List([FromQuery] int take = 30,
        CancellationToken ct = default)
    {
        if (take < 1 || take > 100) return BadRequest(new { message = "take 1–100 aralığında olmalıdır." });
        var audits = await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.OccurredAtUtc)
            .Take(take).Select(x => new AuditDto(x.Id, x.Action, x.EntityType,
                x.EntityId, x.OccurredAtUtc, x.Actor == null ? null : x.Actor.Email, x.DataJson))
            .ToListAsync(ct);
        return Ok(audits);
    }
}
