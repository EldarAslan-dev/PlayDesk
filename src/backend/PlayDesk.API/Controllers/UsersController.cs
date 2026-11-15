using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlayDesk.Application;
using PlayDesk.Domain;

namespace PlayDesk.API.Controllers;

[ApiController, Authorize(Roles = AppRoles.Admin), Route("api/users")]
public sealed class UsersController(IUserManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ManagedUserDto>>> List(CancellationToken ct) =>
        Ok(await service.AllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ManagedUserDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await service.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<ManagedUserDto>> Create(CreateManagedUserRequest request, CancellationToken ct)
    {
        var user = await service.CreateAsync(request, Actor(), ct);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }

    [HttpPatch("{id:guid}/active")]
    public async Task<ActionResult<ManagedUserDto>> SetActive(Guid id, ChangeUserActiveRequest request, CancellationToken ct) =>
        Ok(await service.SetActiveAsync(id, request, Actor(), ct));

    private Guid Actor() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
