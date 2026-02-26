using System.Collections.Concurrent;
using Magalcom.Crm.Shared.Contracts.Reports;

namespace Magalcom.Crm.WebApi.Services;

public sealed class PredictionJobStore
{
    private readonly ConcurrentDictionary<Guid, PredictionJobDto> _jobs = new();

    public void Set(PredictionJobDto job) => _jobs[job.JobId] = job;

    public bool TryGet(Guid id, out PredictionJobDto? job) => _jobs.TryGetValue(id, out job);
}
