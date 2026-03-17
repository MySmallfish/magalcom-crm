using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.WebApi.Leads;

internal static class SalesMonthlyReportBuilder
{
    public static SalesMonthlyReportDto Build(IEnumerable<StatisticsReportEntryDto> entries, SalesMonthlyReportQuery query)
    {
        ArgumentNullException.ThrowIfNull(entries);
        ArgumentNullException.ThrowIfNull(query);

        if (!query.FromDate.HasValue || !query.ToDate.HasValue)
        {
            throw new ArgumentException("FromDate and ToDate are required.", nameof(query));
        }

        var fromDate = new DateOnly(query.FromDate.Value.Year, query.FromDate.Value.Month, 1);
        var toDate = new DateOnly(query.ToDate.Value.Year, query.ToDate.Value.Month, 1);
        if (fromDate > toDate)
        {
            throw new ArgumentException("FromDate must be earlier than or equal to ToDate.", nameof(query));
        }

        var entryArray = entries.ToArray();
        var months = ExpandMonths(fromDate, toDate);
        var availableSalesPeople = entryArray
            .GroupBy(item => item.SalesPerson.SubjectId, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First().SalesPerson)
            .OrderBy(item => item.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var filteredEntries = entryArray
            .Where(item => string.IsNullOrWhiteSpace(query.OwnerSubjectId)
                || string.Equals(item.SalesPerson.SubjectId, query.OwnerSubjectId, StringComparison.OrdinalIgnoreCase))
            .Where(item => NormalizeMonth(item.EntryDate) >= fromDate && NormalizeMonth(item.EntryDate) <= toDate)
            .ToArray();

        var rowMaps = new Dictionary<string, OwnerMonthlyAccumulator>(StringComparer.OrdinalIgnoreCase);
        foreach (var entry in filteredEntries)
        {
            var accumulator = GetOrCreateAccumulator(rowMaps, entry.SalesPerson);
            var month = NormalizeMonth(entry.EntryDate);
            accumulator.Projected[month] = accumulator.Projected.TryGetValue(month, out var projectedAmount)
                ? projectedAmount + entry.ProjectedAmount
                : entry.ProjectedAmount;
            accumulator.Actual[month] = accumulator.Actual.TryGetValue(month, out var actualAmount)
                ? actualAmount + entry.ActualAmount
                : entry.ActualAmount;
        }

        var rows = rowMaps.Values
            .Select(item => BuildRow(item, months))
            .Where(item => item.ProjectedTotal > 0 || item.ActualTotal > 0)
            .OrderBy(item => item.SalesPerson.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var totalMonths = months
            .Select(month =>
            {
                var projectedAmount = rows.Sum(row => row.Months.First(value => value.MonthStart == month).ProjectedAmount);
                var actualAmount = rows.Sum(row => row.Months.First(value => value.MonthStart == month).ActualAmount);
                return new SalesMonthlyReportMonthValueDto(month, projectedAmount, actualAmount);
            })
            .ToArray();

        return new SalesMonthlyReportDto(
            availableSalesPeople,
            months.Select(month => new SalesMonthlyReportMonthDto(month)).ToArray(),
            rows,
            new SalesMonthlyReportTotalsDto(
                totalMonths,
                totalMonths.Sum(item => item.ProjectedAmount),
                totalMonths.Sum(item => item.ActualAmount)));
    }

    private static OwnerMonthlyAccumulator GetOrCreateAccumulator(IDictionary<string, OwnerMonthlyAccumulator> map, LeadOwnerDto owner)
    {
        if (map.TryGetValue(owner.SubjectId, out var existing))
        {
            return existing;
        }

        var created = new OwnerMonthlyAccumulator(owner);
        map[owner.SubjectId] = created;
        return created;
    }

    private static SalesMonthlyReportRowDto BuildRow(OwnerMonthlyAccumulator accumulator, IReadOnlyList<DateOnly> months)
    {
        var values = months
            .Select(month => new SalesMonthlyReportMonthValueDto(
                month,
                accumulator.Projected.TryGetValue(month, out var projectedAmount) ? projectedAmount : 0m,
                accumulator.Actual.TryGetValue(month, out var actualAmount) ? actualAmount : 0m))
            .ToArray();

        return new SalesMonthlyReportRowDto(
            accumulator.Owner,
            values,
            values.Sum(item => item.ProjectedAmount),
            values.Sum(item => item.ActualAmount));
    }

    private static IReadOnlyList<DateOnly> ExpandMonths(DateOnly fromDate, DateOnly toDate)
    {
        var months = new List<DateOnly>();
        var cursor = fromDate;
        while (cursor <= toDate)
        {
            months.Add(cursor);
            cursor = cursor.AddMonths(1);
        }

        return months;
    }

    private static DateOnly NormalizeMonth(DateOnly value) => new(value.Year, value.Month, 1);

    private sealed class OwnerMonthlyAccumulator
    {
        public OwnerMonthlyAccumulator(LeadOwnerDto owner)
        {
            Owner = owner;
        }

        public LeadOwnerDto Owner { get; }
        public Dictionary<DateOnly, decimal> Projected { get; } = new();
        public Dictionary<DateOnly, decimal> Actual { get; } = new();
    }
}
