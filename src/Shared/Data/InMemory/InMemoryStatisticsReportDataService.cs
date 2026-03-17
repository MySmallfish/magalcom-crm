using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemoryStatisticsReportDataService : IStatisticsReportDataService
{
    private readonly IReadOnlyCollection<StatisticsReportEntryDto> _entries = SeedEntries();

    public Task<IReadOnlyCollection<StatisticsReportEntryDto>> GetEntriesAsync(LeadQueryScope? scope = null, CancellationToken cancellationToken = default)
    {
        scope ??= LeadQueryScope.All;

        var entries = _entries
            .Where(item => scope.CanViewAll
                || (!string.IsNullOrWhiteSpace(scope.SubjectId)
                    && string.Equals(item.SalesPerson.SubjectId, scope.SubjectId, StringComparison.OrdinalIgnoreCase)))
            .OrderBy(item => item.EntryDate)
            .ThenBy(item => item.SalesPerson.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return Task.FromResult<IReadOnlyCollection<StatisticsReportEntryDto>>(entries);
    }

    private static IReadOnlyCollection<StatisticsReportEntryDto> SeedEntries()
    {
        var owners = new[]
        {
            new LeadOwnerDto("dev-user-001", "Development User", "developer@magalcom.local"),
            new LeadOwnerDto("sales-user-002", "Alice Cohen", "alice.cohen@magalcom.local"),
            new LeadOwnerDto("sales-user-003", "Moshe Levi", "moshe.levi@magalcom.local")
        };

        var entries = new List<StatisticsReportEntryDto>();
        var start = new DateOnly(2026, 1, 1);
        for (var monthIndex = 0; monthIndex < 12; monthIndex++)
        {
            var entryDate = start.AddMonths(monthIndex);
            for (var ownerIndex = 0; ownerIndex < owners.Length; ownerIndex++)
            {
                var projectedBase = ownerIndex switch
                {
                    0 => 18000m,
                    1 => 14000m,
                    _ => 11000m
                };

                var actualBase = ownerIndex switch
                {
                    0 => 15200m,
                    1 => 11800m,
                    _ => 9100m
                };

                var projectedAmount = projectedBase + (monthIndex * (ownerIndex + 2) * 850m);
                var actualAmount = actualBase + (monthIndex * (ownerIndex + 1) * 710m);

                entries.Add(new StatisticsReportEntryDto(
                    Guid.NewGuid(),
                    owners[ownerIndex],
                    entryDate,
                    decimal.Round(projectedAmount, 2, MidpointRounding.AwayFromZero),
                    decimal.Round(actualAmount, 2, MidpointRounding.AwayFromZero)));
            }
        }

        return entries;
    }
}
