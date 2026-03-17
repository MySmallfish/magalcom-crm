namespace Magalcom.Crm.WebApi.Leads;

public sealed class SalesMonthlyReportQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? OwnerSubjectId { get; set; }
    public string? Locale { get; set; }
}
