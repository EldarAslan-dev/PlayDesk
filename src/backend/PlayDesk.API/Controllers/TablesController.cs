using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlayDesk.Application;
using PlayDesk.Domain;

namespace PlayDesk.API.Controllers;

[ApiController, Authorize, Route("api/tables")]
public sealed class TablesController(IPlayDeskService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TableDto>>> List([FromQuery] bool? isAvailable, CancellationToken ct) =>
        Ok(await service.TablesAsync(isAvailable, ct));

    [HttpPatch("{id:guid}/rate"), Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<TableDto>> ChangeRate(Guid id, RateUpdateRequest request, CancellationToken ct) =>
        Ok(await service.ChangeRateAsync(id, request, Actor(), ct));

    [HttpPatch("{id:guid}/availability"), Authorize(Roles = AppRoles.Admin)]
    public async Task<ActionResult<TableDto>> ChangeAvailability(Guid id, AvailabilityUpdateRequest request, CancellationToken ct) =>
        Ok(await service.ChangeAvailabilityAsync(id, request, Actor(), ct));

    private Guid Actor() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
