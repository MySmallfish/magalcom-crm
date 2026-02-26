namespace Magalcom.Crm.Backend.Services;

public sealed class ScheduledImportWorker : BackgroundService
{
    private readonly ILogger<ScheduledImportWorker> _logger;

    public ScheduledImportWorker(ILogger<ScheduledImportWorker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Scheduled import heartbeat at {UtcNow}", DateTime.UtcNow);
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        }
    }
}
