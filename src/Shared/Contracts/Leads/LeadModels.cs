namespace Magalcom.Crm.Shared.Contracts.Leads;

public enum LeadStage
{
    Before = 0,
    Approaching = 1,
    Sent = 2
}

public enum LeadOfferStatus
{
    Open = 0,
    Win = 1,
    Lose = 2,
    Suspended = 3,
    Cancelled = 4
}

public sealed record LeadOwnerDto(
    string SubjectId,
    string DisplayName,
    string Email);

public sealed record LeadCustomerDto(
    Guid Id,
    string Name,
    string ExternalId);

public sealed record LeadProjectDto(
    Guid Id,
    Guid CustomerId,
    string Name,
    bool IsActive);

public sealed record WorkTypeDto(
    Guid Id,
    string Code,
    string Name,
    int SortOrder,
    bool IsActive);

public sealed record QualificationQuestionDefinitionDto(
    string Code,
    string Label,
    int Weight,
    bool IsOverrideRule,
    int SortOrder);

public sealed record StageCoefficientDto(
    LeadStage Stage,
    decimal Value);

public sealed record LeadQualificationAnswerDto(
    string QuestionCode,
    bool? Answer);

public sealed record LeadAmountLineDto(
    Guid Id,
    Guid WorkTypeId,
    string WorkTypeCode,
    string WorkTypeName,
    decimal Amount,
    string Note);

public sealed record LeadWorkTypeTotalDto(
    Guid WorkTypeId,
    string WorkTypeCode,
    string WorkTypeName,
    decimal Amount);

public sealed record LeadMetricsDto(
    decimal TotalAmount,
    decimal QualificationScore,
    decimal QualificationContribution,
    decimal StageContribution,
    decimal ChanceToWin,
    decimal ForecastAmount,
    decimal HighConfidenceForecastAmount,
    decimal WonAmount);

public sealed record LeadAuditEntryDto(
    DateTime ChangedAtUtc,
    string ChangedBy,
    string Action,
    string Summary);

public sealed record LeadDto(
    Guid Id,
    LeadOwnerDto Owner,
    LeadCustomerDto Customer,
    LeadProjectDto Project,
    string Comments,
    IReadOnlyCollection<LeadQualificationAnswerDto> QualificationAnswers,
    LeadStage? Stage,
    bool? IsPerpetual,
    DateOnly? DueDate,
    LeadOfferStatus OfferStatus,
    decimal? ActualAwardedAmount,
    IReadOnlyCollection<LeadAmountLineDto> AmountLines,
    LeadMetricsDto Metrics,
    bool IsIncomplete,
    IReadOnlyCollection<string> MissingFields,
    IReadOnlyCollection<LeadWorkTypeTotalDto> AmountTotalsByWorkType,
    IReadOnlyCollection<LeadAuditEntryDto> AuditTrail,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record LeadQualificationAnswerRequest(
    string QuestionCode,
    bool? Answer);

public sealed record LeadAmountLineRequest(
    Guid? Id,
    Guid WorkTypeId,
    decimal Amount,
    string Note);

public sealed record CreateLeadRequest(
    Guid CustomerId,
    Guid? ProjectId,
    string ProjectName,
    string Comments,
    IReadOnlyCollection<LeadQualificationAnswerRequest> QualificationAnswers,
    LeadStage? Stage,
    bool? IsPerpetual,
    DateOnly? DueDate,
    LeadOfferStatus OfferStatus,
    decimal? ActualAwardedAmount,
    IReadOnlyCollection<LeadAmountLineRequest> AmountLines);

public sealed record UpdateLeadRequest(
    Guid CustomerId,
    Guid? ProjectId,
    string ProjectName,
    string Comments,
    IReadOnlyCollection<LeadQualificationAnswerRequest> QualificationAnswers,
    LeadStage? Stage,
    bool? IsPerpetual,
    DateOnly? DueDate,
    LeadOfferStatus OfferStatus,
    decimal? ActualAwardedAmount,
    IReadOnlyCollection<LeadAmountLineRequest> AmountLines);

public sealed record LeadModuleMetadataDto(
    IReadOnlyCollection<LeadCustomerDto> Customers,
    IReadOnlyCollection<LeadProjectDto> Projects,
    IReadOnlyCollection<WorkTypeDto> WorkTypes,
    IReadOnlyCollection<QualificationQuestionDefinitionDto> QualificationQuestions,
    IReadOnlyCollection<StageCoefficientDto> StageCoefficients);

public sealed record CreateWorkTypeRequest(
    string Code,
    string Name,
    int SortOrder,
    bool IsActive);

public sealed record UpdateWorkTypeRequest(
    string Code,
    string Name,
    int SortOrder,
    bool IsActive);
