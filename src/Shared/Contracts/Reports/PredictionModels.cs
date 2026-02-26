namespace Magalcom.Crm.Shared.Contracts.Reports;

public enum PredictionJobStatus
{
    Queued = 0,
    Running = 1,
    Completed = 2,
    Failed = 3
}

public sealed record CreatePredictionJobRequest(
    string GroupBy,
    string? Department,
    string? Domain,
    string? SalesPerson,
    Guid? ProjectId);

public sealed record PredictionJobDto(
    Guid JobId,
    PredictionJobStatus Status,
    DateTime RequestedAtUtc,
    DateTime? CompletedAtUtc,
    string? ResultUri,
    string? Error);
