using Magalcom.Crm.Shared.Contracts.Admin;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface IProjectDataService
{
    Task<IReadOnlyCollection<ProjectDto>> GetProjectsAsync(CancellationToken cancellationToken = default);
    Task<ProjectDto?> SaveProjectAsync(Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default);
}
