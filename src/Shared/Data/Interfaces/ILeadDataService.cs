using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface ILeadDataService
{
    Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(CancellationToken cancellationToken = default);
    Task<LeadDto?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default);
    Task<LeadDto> AddLeadAsync(CreateLeadRequest request, CancellationToken cancellationToken = default);
    Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default);
}
