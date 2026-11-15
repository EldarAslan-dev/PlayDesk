using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlayDesk.Application;

namespace PlayDesk.API.Controllers;

[ApiController, Authorize, Route("api/sessions")]
public sealed class SessionsController(IPlayDeskService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SessionDto>>> List([FromQuery] bool? activeOnly, CancellationToken ct) =>
        Ok(await service.SessionsAsync(activeOnly, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SessionDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await service.SessionAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<SessionDto>> Create(CreateSessionRequest request, CancellationToken ct)
    {
        var session = await service.CreateSessionAsync(request, Actor(), ct);
        return CreatedAtAction(nameof(Get), new { id = session.Id }, session);
    }

    [HttpPost("{id:guid}/payment")]
    public async Task<ActionResult<PaymentDto>> Pay(Guid id, PaymentRequest request, CancellationToken ct)
    {
        var payment = await service.PayAsync(id, request, Actor(), ct);
        return StatusCode(StatusCodes.Status201Created, payment);
    }

    private Guid Actor() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
