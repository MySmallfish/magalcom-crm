using ClosedXML.Excel;
using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.WebApi.Leads;

internal static class LeadExportWorkbookBuilder
{
    private const string DefaultSortBy = "updatedAt";
    private const string ContractTypePerpetual = "perpetual";
    private const string ContractTypeAuction = "auction";
    private const string LocaleHebrew = "he";

    public static IReadOnlyList<LeadDto> ApplyQuery(IEnumerable<LeadDto> leads, LeadExportQuery query)
    {
        ArgumentNullException.ThrowIfNull(leads);
        ArgumentNullException.ThrowIfNull(query);

        var search = Normalize(query.Search);
        var filtered = leads.Where(lead =>
        {
            if (!string.IsNullOrWhiteSpace(search)
                && !Normalize($"{lead.Customer.Name} {lead.Project.Name} {lead.Comments}").Contains(search, StringComparison.Ordinal))
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(query.OwnerSubjectId)
                && !string.Equals(lead.Owner.SubjectId, query.OwnerSubjectId, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (query.CustomerId.HasValue && lead.Customer.Id != query.CustomerId.Value)
            {
                return false;
            }

            if (query.WorkTypeId.HasValue && !lead.AmountLines.Any(line => line.WorkTypeId == query.WorkTypeId.Value))
            {
                return false;
            }

            if (string.Equals(query.ContractType, ContractTypePerpetual, StringComparison.OrdinalIgnoreCase) && lead.IsPerpetual != true)
            {
                return false;
            }

            if (string.Equals(query.ContractType, ContractTypeAuction, StringComparison.OrdinalIgnoreCase) && lead.IsPerpetual != false)
            {
                return false;
            }

            if (query.Stage.HasValue && lead.Stage != query.Stage.Value)
            {
                return false;
            }

            if (query.OfferStatus.HasValue && lead.OfferStatus != query.OfferStatus.Value)
            {
                return false;
            }

            if (query.DueDateFrom.HasValue && (!lead.DueDate.HasValue || lead.DueDate.Value < query.DueDateFrom.Value))
            {
                return false;
            }

            if (query.DueDateTo.HasValue && (!lead.DueDate.HasValue || lead.DueDate.Value > query.DueDateTo.Value))
            {
                return false;
            }

            if (query.AmountMin.HasValue && lead.Metrics.TotalAmount < query.AmountMin.Value)
            {
                return false;
            }

            if (query.AmountMax.HasValue && lead.Metrics.TotalAmount > query.AmountMax.Value)
            {
                return false;
            }

            return true;
        });

        return Sort(filtered, query.SortBy).ToArray();
    }

    public static byte[] BuildWorkbook(IReadOnlyCollection<LeadDto> leads, LeadExportQuery query)
    {
        ArgumentNullException.ThrowIfNull(leads);
        ArgumentNullException.ThrowIfNull(query);

        using var workbook = new XLWorkbook();
        var locale = NormalizeLocale(query.Locale);

        BuildSummarySheet(workbook.AddWorksheet(Translate(locale, "sheet.summary")), leads, query, locale);
        BuildDetailsSheet(workbook.AddWorksheet(Translate(locale, "sheet.details")), leads, locale);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public static string BuildFileName(LeadExportQuery query)
    {
        var scope = HasAnyFilter(query) ? "filtered" : "report";
        return $"leads-{scope}-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
    }

    private static void BuildSummarySheet(IXLWorksheet sheet, IReadOnlyCollection<LeadDto> leads, LeadExportQuery query, string locale)
    {
        var title = Translate(locale, "sheet.summary");
        var generatedAt = DateTime.UtcNow;
        var filterText = DescribeFilters(query, locale);
        var summaryRows = BuildSummaryRows(leads, locale);
        var headers = new[]
        {
            Translate(locale, "summary.salesman"),
            Translate(locale, "summary.leads"),
            Translate(locale, "summary.pipeline"),
            Translate(locale, "summary.forecast"),
            Translate(locale, "summary.highConfidence"),
            Translate(locale, "summary.won"),
            Translate(locale, "summary.open"),
            Translate(locale, "summary.win"),
            Translate(locale, "summary.lose"),
            Translate(locale, "summary.suspended"),
            Translate(locale, "summary.cancelled"),
            Translate(locale, "summary.incomplete")
        };

        sheet.Cell(1, 1).Value = title;
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 16;
        sheet.Cell(2, 1).Value = Translate(locale, "meta.generatedAt");
        sheet.Cell(2, 2).Value = generatedAt;
        sheet.Cell(2, 2).Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
        sheet.Cell(3, 1).Value = Translate(locale, "meta.filters");
        sheet.Cell(3, 2).Value = filterText;

        for (var columnIndex = 0; columnIndex < headers.Length; columnIndex++)
        {
            sheet.Cell(5, columnIndex + 1).Value = headers[columnIndex];
        }

        for (var rowIndex = 0; rowIndex < summaryRows.Count; rowIndex++)
        {
            var row = summaryRows[rowIndex];
            var excelRow = rowIndex + 6;
            sheet.Cell(excelRow, 1).Value = row.Salesman;
            sheet.Cell(excelRow, 2).Value = row.LeadCount;
            sheet.Cell(excelRow, 3).Value = row.PipelineAmount;
            sheet.Cell(excelRow, 4).Value = row.ForecastAmount;
            sheet.Cell(excelRow, 5).Value = row.HighConfidenceAmount;
            sheet.Cell(excelRow, 6).Value = row.WonAmount;
            sheet.Cell(excelRow, 7).Value = row.OpenCount;
            sheet.Cell(excelRow, 8).Value = row.WinCount;
            sheet.Cell(excelRow, 9).Value = row.LoseCount;
            sheet.Cell(excelRow, 10).Value = row.SuspendedCount;
            sheet.Cell(excelRow, 11).Value = row.CancelledCount;
            sheet.Cell(excelRow, 12).Value = row.IncompleteCount;
        }

        if (summaryRows.Count > 0)
        {
            var tableRange = sheet.Range(5, 1, summaryRows.Count + 5, headers.Length);
            var table = tableRange.CreateTable("LeadSummary");
            table.Theme = XLTableTheme.TableStyleMedium2;
            table.ShowAutoFilter = true;
        }

        ApplySummarySheetStyling(sheet, summaryRows.Count, headers.Length);
    }

    private static void BuildDetailsSheet(IXLWorksheet sheet, IReadOnlyCollection<LeadDto> leads, string locale)
    {
        var headers = new[]
        {
            Translate(locale, "details.salesman"),
            Translate(locale, "details.customer"),
            Translate(locale, "details.project"),
            Translate(locale, "details.offerStatus"),
            Translate(locale, "details.stage"),
            Translate(locale, "details.contractType"),
            Translate(locale, "details.dueDate"),
            Translate(locale, "details.total"),
            Translate(locale, "details.forecast"),
            Translate(locale, "details.highConfidence"),
            Translate(locale, "details.won"),
            Translate(locale, "details.actualAwarded"),
            Translate(locale, "details.qualificationScore"),
            Translate(locale, "details.chanceToWin"),
            Translate(locale, "details.comments"),
            Translate(locale, "details.updatedAt")
        };

        for (var columnIndex = 0; columnIndex < headers.Length; columnIndex++)
        {
            sheet.Cell(1, columnIndex + 1).Value = headers[columnIndex];
        }

        var leadRows = leads.ToArray();
        for (var rowIndex = 0; rowIndex < leadRows.Length; rowIndex++)
        {
            var lead = leadRows[rowIndex];
            var excelRow = rowIndex + 2;
            sheet.Cell(excelRow, 1).Value = lead.Owner.DisplayName;
            sheet.Cell(excelRow, 2).Value = lead.Customer.Name;
            sheet.Cell(excelRow, 3).Value = lead.Project.Name;
            sheet.Cell(excelRow, 4).Value = TranslateOfferStatus(locale, lead.OfferStatus);
            sheet.Cell(excelRow, 5).Value = lead.Stage.HasValue ? TranslateStage(locale, lead.Stage.Value) : Translate(locale, "common.notSet");
            sheet.Cell(excelRow, 6).Value = TranslateContractType(locale, lead.IsPerpetual);
            if (lead.DueDate.HasValue)
            {
                sheet.Cell(excelRow, 7).Value = lead.DueDate.Value.ToDateTime(TimeOnly.MinValue);
            }

            sheet.Cell(excelRow, 8).Value = lead.Metrics.TotalAmount;
            sheet.Cell(excelRow, 9).Value = lead.Metrics.ForecastAmount;
            sheet.Cell(excelRow, 10).Value = lead.Metrics.HighConfidenceForecastAmount;
            sheet.Cell(excelRow, 11).Value = lead.Metrics.WonAmount;
            if (lead.ActualAwardedAmount.HasValue)
            {
                sheet.Cell(excelRow, 12).Value = lead.ActualAwardedAmount.Value;
            }

            sheet.Cell(excelRow, 13).Value = lead.Metrics.QualificationScore / 100m;
            sheet.Cell(excelRow, 14).Value = lead.Metrics.ChanceToWin / 100m;
            sheet.Cell(excelRow, 15).Value = lead.Comments;
            sheet.Cell(excelRow, 16).Value = lead.UpdatedAtUtc;
        }

        if (leadRows.Length > 0)
        {
            var tableRange = sheet.Range(1, 1, leadRows.Length + 1, headers.Length);
            var table = tableRange.CreateTable("LeadDetails");
            table.Theme = XLTableTheme.TableStyleMedium2;
            table.ShowAutoFilter = true;
        }

        ApplyDetailsSheetStyling(sheet, leadRows.Length, headers.Length);
    }

    private static void ApplySummarySheetStyling(IXLWorksheet sheet, int rowCount, int columnCount)
    {
        if (rowCount > 0)
        {
            var numericRange = sheet.Range(6, 3, rowCount + 5, 6);
            numericRange.Style.NumberFormat.Format = "#,##0.00";

            var countRange = sheet.Range(6, 2, rowCount + 5, 2);
            countRange.Style.NumberFormat.Format = "#,##0";

            var statusRange = sheet.Range(6, 7, rowCount + 5, 12);
            statusRange.Style.NumberFormat.Format = "#,##0";
        }

        sheet.SheetView.FreezeRows(5);
        sheet.Columns(1, columnCount).AdjustToContents();
    }

    private static void ApplyDetailsSheetStyling(IXLWorksheet sheet, int rowCount, int columnCount)
    {
        if (rowCount > 0)
        {
            sheet.Range(2, 7, rowCount + 1, 7).Style.DateFormat.Format = "yyyy-mm-dd";
            sheet.Range(2, 8, rowCount + 1, 12).Style.NumberFormat.Format = "#,##0.00";
            sheet.Range(2, 13, rowCount + 1, 14).Style.NumberFormat.Format = "0.00%";
            sheet.Range(2, 16, rowCount + 1, 16).Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
        }

        sheet.SheetView.FreezeRows(1);
        sheet.Columns(1, columnCount).AdjustToContents();
    }

    private static List<LeadExportSummaryRow> BuildSummaryRows(IEnumerable<LeadDto> leads, string locale)
    {
        var leadArray = leads.ToArray();
        var groupedRows = leadArray
            .GroupBy(lead => lead.Owner.SubjectId, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var owner = group.First().Owner;
                return CreateSummaryRow(owner.DisplayName, group);
            })
            .OrderByDescending(row => row.PipelineAmount)
            .ThenBy(row => row.Salesman, StringComparer.OrdinalIgnoreCase)
            .ToList();

        groupedRows.Insert(0, CreateSummaryRow(Translate(locale, "summary.total"), leadArray));
        return groupedRows;
    }

    private static LeadExportSummaryRow CreateSummaryRow(string label, IEnumerable<LeadDto> leads)
    {
        var leadArray = leads.ToArray();
        return new LeadExportSummaryRow(
            label,
            leadArray.Length,
            leadArray.Sum(lead => lead.Metrics.TotalAmount),
            leadArray.Sum(lead => lead.Metrics.ForecastAmount),
            leadArray.Sum(lead => lead.Metrics.HighConfidenceForecastAmount),
            leadArray.Sum(lead => lead.Metrics.WonAmount),
            leadArray.Count(lead => lead.OfferStatus == LeadOfferStatus.Open),
            leadArray.Count(lead => lead.OfferStatus == LeadOfferStatus.Win),
            leadArray.Count(lead => lead.OfferStatus == LeadOfferStatus.Lose),
            leadArray.Count(lead => lead.OfferStatus == LeadOfferStatus.Suspended),
            leadArray.Count(lead => lead.OfferStatus == LeadOfferStatus.Cancelled),
            leadArray.Count(lead => lead.IsIncomplete));
    }

    private static IEnumerable<LeadDto> Sort(IEnumerable<LeadDto> leads, string? sortBy) =>
        (sortBy ?? DefaultSortBy) switch
        {
            "dueDate" => leads.OrderBy(lead => lead.DueDate ?? DateOnly.MaxValue).ThenByDescending(lead => lead.UpdatedAtUtc),
            "totalAmount" => leads.OrderByDescending(lead => lead.Metrics.TotalAmount).ThenByDescending(lead => lead.UpdatedAtUtc),
            "forecastAmount" => leads.OrderByDescending(lead => lead.Metrics.ForecastAmount).ThenByDescending(lead => lead.UpdatedAtUtc),
            "chanceToWin" => leads.OrderByDescending(lead => lead.Metrics.ChanceToWin).ThenByDescending(lead => lead.UpdatedAtUtc),
            _ => leads.OrderByDescending(lead => lead.UpdatedAtUtc)
        };

    private static bool HasAnyFilter(LeadExportQuery query) =>
        !string.IsNullOrWhiteSpace(query.Search)
        || !string.IsNullOrWhiteSpace(query.OwnerSubjectId)
        || query.CustomerId.HasValue
        || query.WorkTypeId.HasValue
        || !string.IsNullOrWhiteSpace(query.ContractType)
        || query.Stage.HasValue
        || query.OfferStatus.HasValue
        || query.DueDateFrom.HasValue
        || query.DueDateTo.HasValue
        || query.AmountMin.HasValue
        || query.AmountMax.HasValue;

    private static string DescribeFilters(LeadExportQuery query, string locale)
    {
        if (!HasAnyFilter(query))
        {
            return Translate(locale, "filters.none");
        }

        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            parts.Add($"{Translate(locale, "filter.search")}: {query.Search}");
        }

        if (!string.IsNullOrWhiteSpace(query.OwnerSubjectId))
        {
            parts.Add($"{Translate(locale, "filter.owner")}: {query.OwnerSubjectId}");
        }

        if (query.CustomerId.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.customer")}: {query.CustomerId}");
        }

        if (query.WorkTypeId.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.workType")}: {query.WorkTypeId}");
        }

        if (!string.IsNullOrWhiteSpace(query.ContractType))
        {
            parts.Add($"{Translate(locale, "filter.contractType")}: {TranslateContractTypeValue(locale, query.ContractType)}");
        }

        if (query.Stage.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.stage")}: {TranslateStage(locale, query.Stage.Value)}");
        }

        if (query.OfferStatus.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.offerStatus")}: {TranslateOfferStatus(locale, query.OfferStatus.Value)}");
        }

        if (query.DueDateFrom.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.dueFrom")}: {query.DueDateFrom:yyyy-MM-dd}");
        }

        if (query.DueDateTo.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.dueTo")}: {query.DueDateTo:yyyy-MM-dd}");
        }

        if (query.AmountMin.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.amountMin")}: {query.AmountMin.Value:#,##0.##}");
        }

        if (query.AmountMax.HasValue)
        {
            parts.Add($"{Translate(locale, "filter.amountMax")}: {query.AmountMax.Value:#,##0.##}");
        }

        return string.Join(" | ", parts);
    }

    private static string Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();

    private static string NormalizeLocale(string? locale) =>
        string.Equals(locale, LocaleHebrew, StringComparison.OrdinalIgnoreCase)
            ? LocaleHebrew
            : "en";

    private static string Translate(string locale, string key) =>
        (locale, key) switch
        {
            (LocaleHebrew, "sheet.summary") => "סיכום",
            (LocaleHebrew, "sheet.details") => "פרטים",
            (LocaleHebrew, "meta.generatedAt") => "נוצר בתאריך",
            (LocaleHebrew, "meta.filters") => "מסננים",
            (LocaleHebrew, "filters.none") => "ללא מסננים",
            (LocaleHebrew, "summary.total") => "סה\"כ",
            (LocaleHebrew, "summary.salesman") => "איש מכירות",
            (LocaleHebrew, "summary.leads") => "מספר לידים",
            (LocaleHebrew, "summary.pipeline") => "סכום פייפליין",
            (LocaleHebrew, "summary.forecast") => "תחזית",
            (LocaleHebrew, "summary.highConfidence") => "תחזית בביטחון גבוה",
            (LocaleHebrew, "summary.won") => "סכום זכייה",
            (LocaleHebrew, "summary.open") => "פתוח",
            (LocaleHebrew, "summary.win") => "זכייה",
            (LocaleHebrew, "summary.lose") => "הפסד",
            (LocaleHebrew, "summary.suspended") => "מושהה",
            (LocaleHebrew, "summary.cancelled") => "בוטל",
            (LocaleHebrew, "summary.incomplete") => "לא שלם",
            (LocaleHebrew, "details.salesman") => "איש מכירות",
            (LocaleHebrew, "details.customer") => "לקוח",
            (LocaleHebrew, "details.project") => "פרויקט",
            (LocaleHebrew, "details.offerStatus") => "סטטוס הצעה",
            (LocaleHebrew, "details.stage") => "שלב",
            (LocaleHebrew, "details.contractType") => "סוג חוזה",
            (LocaleHebrew, "details.dueDate") => "תאריך יעד",
            (LocaleHebrew, "details.total") => "סכום כולל",
            (LocaleHebrew, "details.forecast") => "סכום תחזית",
            (LocaleHebrew, "details.highConfidence") => "תחזית בביטחון גבוה",
            (LocaleHebrew, "details.won") => "סכום זכייה",
            (LocaleHebrew, "details.actualAwarded") => "סכום זכייה בפועל",
            (LocaleHebrew, "details.qualificationScore") => "ציון כשירות",
            (LocaleHebrew, "details.chanceToWin") => "סיכוי לזכייה",
            (LocaleHebrew, "details.comments") => "הערות",
            (LocaleHebrew, "details.updatedAt") => "עודכן בתאריך",
            (LocaleHebrew, "filter.search") => "חיפוש",
            (LocaleHebrew, "filter.owner") => "בעלים",
            (LocaleHebrew, "filter.customer") => "לקוח",
            (LocaleHebrew, "filter.workType") => "סוג עבודה",
            (LocaleHebrew, "filter.contractType") => "סוג חוזה",
            (LocaleHebrew, "filter.stage") => "שלב",
            (LocaleHebrew, "filter.offerStatus") => "סטטוס הצעה",
            (LocaleHebrew, "filter.dueFrom") => "תאריך יעד מ-",
            (LocaleHebrew, "filter.dueTo") => "תאריך יעד עד",
            (LocaleHebrew, "filter.amountMin") => "סכום מינימלי",
            (LocaleHebrew, "filter.amountMax") => "סכום מקסימלי",
            (LocaleHebrew, "common.notSet") => "לא הוגדר",
            ("en", "sheet.summary") => "Summary",
            ("en", "sheet.details") => "Details",
            ("en", "meta.generatedAt") => "Generated At",
            ("en", "meta.filters") => "Filters",
            ("en", "filters.none") => "No filters",
            ("en", "summary.total") => "Total",
            ("en", "summary.salesman") => "Salesman",
            ("en", "summary.leads") => "Lead Count",
            ("en", "summary.pipeline") => "Pipeline Amount",
            ("en", "summary.forecast") => "Forecast Amount",
            ("en", "summary.highConfidence") => "High Confidence Forecast",
            ("en", "summary.won") => "Won Amount",
            ("en", "summary.open") => "Open",
            ("en", "summary.win") => "Win",
            ("en", "summary.lose") => "Lose",
            ("en", "summary.suspended") => "Suspended",
            ("en", "summary.cancelled") => "Cancelled",
            ("en", "summary.incomplete") => "Incomplete",
            ("en", "details.salesman") => "Salesman",
            ("en", "details.customer") => "Customer",
            ("en", "details.project") => "Project",
            ("en", "details.offerStatus") => "Offer Status",
            ("en", "details.stage") => "Stage",
            ("en", "details.contractType") => "Contract Type",
            ("en", "details.dueDate") => "Due Date",
            ("en", "details.total") => "Total Amount",
            ("en", "details.forecast") => "Forecast Amount",
            ("en", "details.highConfidence") => "High Confidence Forecast",
            ("en", "details.won") => "Won Amount",
            ("en", "details.actualAwarded") => "Actual Awarded Amount",
            ("en", "details.qualificationScore") => "Qualification Score",
            ("en", "details.chanceToWin") => "Chance To Win",
            ("en", "details.comments") => "Comments",
            ("en", "details.updatedAt") => "Updated At",
            ("en", "filter.search") => "Search",
            ("en", "filter.owner") => "Owner",
            ("en", "filter.customer") => "Customer",
            ("en", "filter.workType") => "Work Type",
            ("en", "filter.contractType") => "Contract Type",
            ("en", "filter.stage") => "Stage",
            ("en", "filter.offerStatus") => "Offer Status",
            ("en", "filter.dueFrom") => "Due From",
            ("en", "filter.dueTo") => "Due To",
            ("en", "filter.amountMin") => "Amount Min",
            ("en", "filter.amountMax") => "Amount Max",
            ("en", "common.notSet") => "Not set",
            _ => key
        };

    private static string TranslateStage(string locale, LeadStage stage) =>
        (locale, stage) switch
        {
            (LocaleHebrew, LeadStage.Before) => "לפני",
            (LocaleHebrew, LeadStage.Approaching) => "מתקרב",
            (LocaleHebrew, LeadStage.Sent) => "נשלח",
            ("en", LeadStage.Before) => "Before",
            ("en", LeadStage.Approaching) => "Approaching",
            ("en", LeadStage.Sent) => "Sent",
            _ => stage.ToString()
        };

    private static string TranslateOfferStatus(string locale, LeadOfferStatus offerStatus) =>
        (locale, offerStatus) switch
        {
            (LocaleHebrew, LeadOfferStatus.Open) => "פתוח",
            (LocaleHebrew, LeadOfferStatus.Win) => "זכייה",
            (LocaleHebrew, LeadOfferStatus.Lose) => "הפסד",
            (LocaleHebrew, LeadOfferStatus.Suspended) => "מושהה",
            (LocaleHebrew, LeadOfferStatus.Cancelled) => "בוטל",
            ("en", LeadOfferStatus.Open) => "Open",
            ("en", LeadOfferStatus.Win) => "Win",
            ("en", LeadOfferStatus.Lose) => "Lose",
            ("en", LeadOfferStatus.Suspended) => "Suspended",
            ("en", LeadOfferStatus.Cancelled) => "Cancelled",
            _ => offerStatus.ToString()
        };

    private static string TranslateContractType(string locale, bool? isPerpetual) =>
        isPerpetual switch
        {
            true => locale == LocaleHebrew ? "מתמשך" : "Perpetual",
            false => locale == LocaleHebrew ? "מכרז / חד-פעמי" : "Auction / One-time",
            null => Translate(locale, "common.notSet")
        };

    private static string TranslateContractTypeValue(string locale, string contractType) =>
        string.Equals(contractType, ContractTypePerpetual, StringComparison.OrdinalIgnoreCase)
            ? (locale == LocaleHebrew ? "מתמשך" : "Perpetual")
            : string.Equals(contractType, ContractTypeAuction, StringComparison.OrdinalIgnoreCase)
                ? (locale == LocaleHebrew ? "מכרז / חד-פעמי" : "Auction / One-time")
                : contractType;

    private sealed record LeadExportSummaryRow(
        string Salesman,
        int LeadCount,
        decimal PipelineAmount,
        decimal ForecastAmount,
        decimal HighConfidenceAmount,
        decimal WonAmount,
        int OpenCount,
        int WinCount,
        int LoseCount,
        int SuspendedCount,
        int CancelledCount,
        int IncompleteCount);
}
