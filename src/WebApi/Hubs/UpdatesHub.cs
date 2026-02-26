using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Magalcom.Crm.WebApi.Hubs;

[Authorize]
public sealed class UpdatesHub : Hub
{
    public async Task Ping(string message)
    {
        await Clients.Caller.SendAsync("Pong", new
        {
            message,
            utcNow = DateTime.UtcNow
        });
    }
}
