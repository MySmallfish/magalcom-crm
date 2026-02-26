using System.Collections.Concurrent;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemoryLeadDataService : ILeadDataService
{
    private readonly ConcurrentDictionary<Guid, LeadDto> _leads = new();

    public InMemoryLeadDataService()
    {
        var seededLead = new LeadDto(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            "Initial Lead",
            "Contoso",
            "Sales",
            "CRM",
            "Alice",
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            50000m,
            LeadStatus.Open,
            DateTime.UtcNow,
            DateTime.UtcNow);

        _leads[seededLead.Id] = seededLead;
    }

    public Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyCollection<LeadDto>>(_leads.Values.OrderBy(x => x.CreatedAtUtc).ToArray());
    }

    public Task<LeadDto?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        _leads.TryGetValue(leadId, out var lead);
        return Task.FromResult(lead);
    }

    public Task<LeadDto> AddLeadAsync(CreateLeadRequest request, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var lead = new LeadDto(
            Guid.NewGuid(),
            request.Title,
            request.CustomerName,
            request.Department,
            request.Domain,
            request.SalesPerson,
            request.ProjectId,
            request.PotentialAmount,
            LeadStatus.Draft,
            now,
            now);

        _leads[lead.Id] = lead;
        return Task.FromResult(lead);
    }

    public Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, CancellationToken cancellationToken = default)
    {
        if (!_leads.TryGetValue(leadId, out var existing))
        {
            return Task.FromResult<LeadDto?>(null);
        }

        var updated = existing with
        {
            Title = request.Title,
            CustomerName = request.CustomerName,
            Department = request.Department,
            Domain = request.Domain,
            SalesPerson = request.SalesPerson,
            ProjectId = request.ProjectId,
            PotentialAmount = request.PotentialAmount,
            Status = request.Status,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _leads[leadId] = updated;
        return Task.FromResult<LeadDto?>(updated);
    }

    public Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_leads.TryRemove(leadId, out _));
    }
}
