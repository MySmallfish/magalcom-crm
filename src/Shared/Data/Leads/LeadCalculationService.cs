using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.Shared.Data.Leads;

public sealed record LeadComputationResult(
    LeadMetricsDto Metrics,
    IReadOnlyCollection<LeadWorkTypeTotalDto> AmountTotalsByWorkType,
    bool IsIncomplete,
    IReadOnlyCollection<string> MissingFields);

public static class LeadCalculationService
{
    public const decimal OrangeSectionCoefficient = 30m;
    public const string PriceListQuestionCode = "customer-under-price-list";

    private static readonly IReadOnlyCollection<QualificationQuestionDefinitionDto> DefaultQuestions =
    [
        new("knows-customer-personally", "Know the customer personally?", 15, false, 1),
        new("returning-customer", "Returning customer?", 15, false, 2),
        new("involved-in-planning", "Involved in project planning?", 25, false, 3),
        new("consultant-relationship", "Relationship with consultant?", 20, false, 4),
        new("project-management-relationship", "Strong relationship with project management?", 25, false, 5),
        new(PriceListQuestionCode, "Customer under price list?", 100, true, 6)
    ];

    private static readonly IReadOnlyCollection<StageCoefficientDto> DefaultStageCoefficients =
    [
        new(LeadStage.Before, 0m),
        new(LeadStage.AuctionKnown, 15m),
        new(LeadStage.AuctionActive, 25m),
        new(LeadStage.Sent, 30m)
    ];

    public static IReadOnlyCollection<QualificationQuestionDefinitionDto> GetDefaultQuestions() => DefaultQuestions;

    public static IReadOnlyCollection<StageCoefficientDto> GetDefaultStageCoefficients() => DefaultStageCoefficients;

    public static LeadComputationResult Compute(
        IReadOnlyCollection<LeadQualificationAnswerDto> qualificationAnswers,
        LeadStage? stage,
        bool? isPerpetual,
        DateOnly? dueDate,
        LeadOfferStatus offerStatus,
        decimal? actualAwardedAmount,
        IReadOnlyCollection<LeadAmountLineDto> amountLines)
    {
        var amountTotals = amountLines
            .GroupBy(line => new { line.WorkTypeId, line.WorkTypeCode, line.WorkTypeName })
            .Select(group => new LeadWorkTypeTotalDto(
                group.Key.WorkTypeId,
                group.Key.WorkTypeCode,
                group.Key.WorkTypeName,
                Math.Round(group.Sum(item => item.Amount), 2, MidpointRounding.AwayFromZero)))
            .OrderBy(item => item.WorkTypeName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var totalAmount = amountTotals.Sum(item => item.Amount);
        var priceListOverride = qualificationAnswers.Any(answer =>
            string.Equals(answer.QuestionCode, PriceListQuestionCode, StringComparison.OrdinalIgnoreCase)
            && answer.Answer == true);

        var questionWeights = DefaultQuestions.ToDictionary(item => item.Code, item => item.Weight, StringComparer.OrdinalIgnoreCase);
        var qualificationScore = priceListOverride
            ? 100m
            : qualificationAnswers
                .Where(answer => answer.Answer == true && questionWeights.ContainsKey(answer.QuestionCode))
                .Sum(answer => questionWeights[answer.QuestionCode]);

        qualificationScore = Math.Clamp(qualificationScore, 0m, 100m);

        var qualificationContribution = Math.Round(qualificationScore * (OrangeSectionCoefficient / 100m), 2, MidpointRounding.AwayFromZero);
        var stageContribution = stage is null
            ? 0m
            : DefaultStageCoefficients.First(item => item.Stage == stage.Value).Value;
        var chanceToWin = Math.Round(Math.Min(100m, qualificationContribution + stageContribution), 2, MidpointRounding.AwayFromZero);

        var forecastAmount = isPerpetual == true
            ? totalAmount
            : Math.Round(totalAmount * (chanceToWin / 100m), 2, MidpointRounding.AwayFromZero);

        var highConfidenceForecastAmount = isPerpetual == true || chanceToWin >= 50m
            ? forecastAmount
            : 0m;

        var wonAmount = offerStatus == LeadOfferStatus.Win
            ? Math.Round(actualAwardedAmount ?? 0m, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var missingFields = new List<string>();
        if (stage is null)
        {
            missingFields.Add("Stage");
        }

        if (dueDate is null)
        {
            missingFields.Add("Due Quarter");
        }

        if (isPerpetual is null)
        {
            missingFields.Add("Perpetual Contract");
        }

        if (amountLines.Count == 0)
        {
            missingFields.Add("Amount Lines");
        }

        if (offerStatus == LeadOfferStatus.Win && actualAwardedAmount is null)
        {
            missingFields.Add("Actual Awarded Amount");
        }

        var metrics = new LeadMetricsDto(
            Math.Round(totalAmount, 2, MidpointRounding.AwayFromZero),
            qualificationScore,
            qualificationContribution,
            stageContribution,
            chanceToWin,
            Math.Round(forecastAmount, 2, MidpointRounding.AwayFromZero),
            Math.Round(highConfidenceForecastAmount, 2, MidpointRounding.AwayFromZero),
            wonAmount);

        return new LeadComputationResult(metrics, amountTotals, missingFields.Count > 0, missingFields);
    }
}
