using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PlayDesk.Application;

namespace PlayDesk.API;

public sealed class SystemClock : IClock { public DateTime UtcNow => DateTime.UtcNow; }

[Authorize]
public sealed class ClubHub : Hub { }

public sealed class SignalRClubEvents(IHubContext<ClubHub> hub, ILogger<SignalRClubEvents> logger) : IClubEvents
{
    public async Task NotifyAsync(string eventName, object payload, CancellationToken ct)
    {
        try { await hub.Clients.All.SendAsync(eventName, payload, ct); }
        catch (Exception ex) { logger.LogError(ex, "Could not publish {EventName}; state will reconcile on refresh", eventName); }
    }
}
