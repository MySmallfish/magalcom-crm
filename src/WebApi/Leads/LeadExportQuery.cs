using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.WebApi.Leads;

public sealed class LeadExportQuery
{
    public string? Search { get; set; }
    public string? OwnerSubjectId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? WorkTypeId { get; set; }
    public string? ContractType { get; set; }
    public LeadStage? Stage { get; set; }
    public LeadOfferStatus? OfferStatus { get; set; }
    public DateOnly? DueDateFrom { get; set; }
    public DateOnly? DueDateTo { get; set; }
    public decimal? AmountMin { get; set; }
    public decimal? AmountMax { get; set; }
    public string? SortBy { get; set; }
    public string? Locale { get; set; }
}
