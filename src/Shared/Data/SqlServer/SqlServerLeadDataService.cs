using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerLeadDataService : ILeadDataService
{
    public Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<LeadDto?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<LeadDto> AddLeadAsync(CreateLeadRequest request, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }
}
