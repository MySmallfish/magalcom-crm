namespace Magalcom.Crm.Backend.Services;

public sealed class PredictionJobWorker : BackgroundService
{
    private readonly ILogger<PredictionJobWorker> _logger;

    public PredictionJobWorker(ILogger<PredictionJobWorker> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("Prediction worker heartbeat at {UtcNow}", DateTime.UtcNow);
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
