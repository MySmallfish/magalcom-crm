using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface ILeadDataService
{
    Task<LeadModuleMetadataDto> GetMetadataAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(CancellationToken cancellationToken = default);
    Task<LeadDto?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default);
    Task<LeadDto> AddLeadAsync(CreateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default);
    Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<WorkTypeDto>> GetWorkTypesAsync(CancellationToken cancellationToken = default);
    Task<WorkTypeDto> AddWorkTypeAsync(CreateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default);
    Task<WorkTypeDto?> SaveWorkTypeAsync(Guid workTypeId, UpdateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default);
    Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default);
}
