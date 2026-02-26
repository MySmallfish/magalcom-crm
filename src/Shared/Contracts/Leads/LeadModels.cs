namespace Magalcom.Crm.Shared.Contracts.Leads;

public enum LeadStatus
{
    Draft = 0,
    Open = 1,
    Qualified = 2,
    Won = 3,
    Lost = 4
}

public sealed record LeadDto(
    Guid Id,
    string Title,
    string CustomerName,
    string Department,
    string Domain,
    string SalesPerson,
    Guid ProjectId,
    decimal PotentialAmount,
    LeadStatus Status,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CreateLeadRequest(
    string Title,
    string CustomerName,
    string Department,
    string Domain,
    string SalesPerson,
    Guid ProjectId,
    decimal PotentialAmount);

public sealed record UpdateLeadRequest(
    string Title,
    string CustomerName,
    string Department,
    string Domain,
    string SalesPerson,
    Guid ProjectId,
    decimal PotentialAmount,
    LeadStatus Status);
