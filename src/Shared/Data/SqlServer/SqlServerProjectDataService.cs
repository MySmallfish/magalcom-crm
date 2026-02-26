using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerProjectDataService : IProjectDataService
{
    public Task<IReadOnlyCollection<ProjectDto>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<ProjectDto?> SaveProjectAsync(Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }
}
