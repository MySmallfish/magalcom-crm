using ClosedXML.Excel;
using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.WebApi.Leads;

internal static class SalesMonthlyReportWorkbookBuilder
{
    private const string LocaleHebrew = "he";

    public static byte[] BuildWorkbook(SalesMonthlyReportDto report, SalesMonthlyReportQuery query)
    {
        ArgumentNullException.ThrowIfNull(report);
        ArgumentNullException.ThrowIfNull(query);

        using var workbook = new XLWorkbook();
        var locale = NormalizeLocale(query.Locale);
        var sheet = workbook.AddWorksheet(Translate(locale, "sheet.title"));
        sheet.RightToLeft = locale == LocaleHebrew;

        BuildSheet(sheet, report, query, locale);

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public static string BuildFileName(SalesMonthlyReportQuery query)
    {
        var fromDate = query.FromDate?.ToString("yyyyMMdd") ?? "from";
        var toDate = query.ToDate?.ToString("yyyyMMdd") ?? "to";
        return $"statistics-report-{fromDate}-{toDate}.xlsx";
    }

    private static void BuildSheet(IXLWorksheet sheet, SalesMonthlyReportDto report, SalesMonthlyReportQuery query, string locale)
    {
        sheet.Cell(1, 1).Value = Translate(locale, "sheet.title");
        sheet.Cell(1, 1).Style.Font.Bold = true;
        sheet.Cell(1, 1).Style.Font.FontSize = 16;
        sheet.Cell(2, 1).Value = Translate(locale, "meta.generatedAt");
        sheet.Cell(2, 2).Value = DateTime.UtcNow;
        sheet.Cell(2, 2).Style.DateFormat.Format = "yyyy-mm-dd hh:mm";
        sheet.Cell(3, 1).Value = Translate(locale, "meta.range");
        sheet.Cell(3, 2).Value = DescribeRange(query, locale);
        sheet.Cell(4, 1).Value = Translate(locale, "meta.salesperson");
        sheet.Cell(4, 2).Value = string.IsNullOrWhiteSpace(query.OwnerSubjectId)
            ? Translate(locale, "filters.all")
            : ResolveSalesPersonLabel(report, query.OwnerSubjectId);
        sheet.Cell(5, 1).Value = Translate(locale, "meta.basis");
        sheet.Cell(5, 2).Value = Translate(locale, "basis.note");

        var headerRow = 7;
        sheet.Cell(headerRow, 1).Value = Translate(locale, "column.salesperson");
        sheet.Cell(headerRow, 2).Value = Translate(locale, "column.metric");

        for (var monthIndex = 0; monthIndex < report.Months.Count; monthIndex++)
        {
            sheet.Cell(headerRow, monthIndex + 3).Value = FormatMonth(locale, report.Months.ElementAt(monthIndex).MonthStart);
        }

        var totalColumn = report.Months.Count + 3;
        sheet.Cell(headerRow, totalColumn).Value = Translate(locale, "column.total");
        sheet.Range(headerRow, 1, headerRow, totalColumn).Style.Font.Bold = true;
        sheet.Range(headerRow, 1, headerRow, totalColumn).Style.Fill.BackgroundColor = XLColor.FromHtml("#e8eef5");

        var rowIndex = headerRow + 1;
        foreach (var row in report.Rows)
        {
            sheet.Cell(rowIndex, 1).Value = row.SalesPerson.DisplayName;
            sheet.Range(rowIndex, 1, rowIndex + 1, 1).Merge();
            sheet.Cell(rowIndex, 2).Value = Translate(locale, "metric.projected");
            sheet.Cell(rowIndex + 1, 2).Value = Translate(locale, "metric.actual");

            var values = row.Months.ToArray();
            for (var monthIndex = 0; monthIndex < values.Length; monthIndex++)
            {
                sheet.Cell(rowIndex, monthIndex + 3).Value = values[monthIndex].ProjectedAmount;
                sheet.Cell(rowIndex + 1, monthIndex + 3).Value = values[monthIndex].ActualAmount;
            }

            sheet.Cell(rowIndex, totalColumn).Value = row.ProjectedTotal;
            sheet.Cell(rowIndex + 1, totalColumn).Value = row.ActualTotal;
            rowIndex += 2;
        }

        sheet.Cell(rowIndex, 1).Value = Translate(locale, "column.total");
        sheet.Range(rowIndex, 1, rowIndex + 1, 1).Merge();
        sheet.Cell(rowIndex, 2).Value = Translate(locale, "metric.projected");
        sheet.Cell(rowIndex + 1, 2).Value = Translate(locale, "metric.actual");

        var totals = report.Totals.Months.ToArray();
        for (var monthIndex = 0; monthIndex < totals.Length; monthIndex++)
        {
            sheet.Cell(rowIndex, monthIndex + 3).Value = totals[monthIndex].ProjectedAmount;
            sheet.Cell(rowIndex + 1, monthIndex + 3).Value = totals[monthIndex].ActualAmount;
        }

        sheet.Cell(rowIndex, totalColumn).Value = report.Totals.ProjectedTotal;
        sheet.Cell(rowIndex + 1, totalColumn).Value = report.Totals.ActualTotal;

        var bodyEndRow = Math.Max(rowIndex + 1, headerRow + 1);
        sheet.Range(headerRow + 1, 1, bodyEndRow, totalColumn).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        sheet.Range(headerRow + 1, 1, bodyEndRow, totalColumn).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
        sheet.Range(headerRow + 1, 3, bodyEndRow, totalColumn).Style.NumberFormat.Format = "#,##0.00";
        sheet.Range(rowIndex, 1, rowIndex + 1, totalColumn).Style.Fill.BackgroundColor = XLColor.FromHtml("#f3f7fb");
        sheet.Range(rowIndex, 1, rowIndex + 1, totalColumn).Style.Font.Bold = true;
        sheet.SheetView.FreezeRows(headerRow);
        sheet.Columns(1, totalColumn).AdjustToContents();
    }

    private static string ResolveSalesPersonLabel(SalesMonthlyReportDto report, string ownerSubjectId)
    {
        return report.Rows.FirstOrDefault(row => string.Equals(row.SalesPerson.SubjectId, ownerSubjectId, StringComparison.OrdinalIgnoreCase))?.SalesPerson.DisplayName
            ?? ownerSubjectId;
    }

    private static string DescribeRange(SalesMonthlyReportQuery query, string locale)
    {
        if (!query.FromDate.HasValue || !query.ToDate.HasValue)
        {
            return Translate(locale, "filters.none");
        }

        return $"{FormatMonth(locale, new DateOnly(query.FromDate.Value.Year, query.FromDate.Value.Month, 1))} - {FormatMonth(locale, new DateOnly(query.ToDate.Value.Year, query.ToDate.Value.Month, 1))}";
    }

    private static string FormatMonth(string locale, DateOnly monthStart)
    {
        var culture = locale == LocaleHebrew ? "he-IL" : "en-US";
        return monthStart.ToDateTime(TimeOnly.MinValue).ToString("MMM yyyy", System.Globalization.CultureInfo.GetCultureInfo(culture));
    }

    private static string NormalizeLocale(string? locale) =>
        string.Equals(locale, LocaleHebrew, StringComparison.OrdinalIgnoreCase) ? LocaleHebrew : "en";

    private static string Translate(string locale, string key) =>
        (locale, key) switch
        {
            (LocaleHebrew, "sheet.title") => "דוח סטטיסטיקות",
            (LocaleHebrew, "meta.generatedAt") => "נוצר בתאריך",
            (LocaleHebrew, "meta.range") => "טווח חודשים",
            (LocaleHebrew, "meta.salesperson") => "איש מכירות",
            (LocaleHebrew, "meta.basis") => "בסיס חישוב",
            (LocaleHebrew, "basis.note") => "מקור הנתונים: טבלת סטטיסטיקות חודשית נפרדת לפי תאריך ואיש מכירות",
            (LocaleHebrew, "column.salesperson") => "איש מכירות",
            (LocaleHebrew, "column.metric") => "מדד",
            (LocaleHebrew, "column.total") => "סה\"כ",
            (LocaleHebrew, "metric.projected") => "תחזית",
            (LocaleHebrew, "metric.actual") => "בפועל",
            (LocaleHebrew, "filters.all") => "הכל",
            (LocaleHebrew, "filters.none") => "ללא",
            ("en", "sheet.title") => "Statistics Report",
            ("en", "meta.generatedAt") => "Generated At",
            ("en", "meta.range") => "Month Range",
            ("en", "meta.salesperson") => "Salesperson",
            ("en", "meta.basis") => "Calculation Basis",
            ("en", "basis.note") => "Data source: dedicated monthly statistics table by date and salesperson",
            ("en", "column.salesperson") => "Salesperson",
            ("en", "column.metric") => "Metric",
            ("en", "column.total") => "Total",
            ("en", "metric.projected") => "Projected",
            ("en", "metric.actual") => "Actual",
            ("en", "filters.all") => "All",
            ("en", "filters.none") => "None",
            _ => key
        };
}
