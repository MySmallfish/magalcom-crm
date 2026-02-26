using System.Collections.Concurrent;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemoryProjectDataService : IProjectDataService
{
    private readonly ConcurrentDictionary<Guid, ProjectDto> _projects = new();

    public InMemoryProjectDataService()
    {
        var project = new ProjectDto(
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            "CRM Core",
            "Sales",
            "CRM",
            true);

        _projects[project.Id] = project;
    }

    public Task<IReadOnlyCollection<ProjectDto>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyCollection<ProjectDto>>(_projects.Values.OrderBy(x => x.Name).ToArray());
    }

    public Task<ProjectDto?> SaveProjectAsync(Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        if (!_projects.TryGetValue(projectId, out var existing))
        {
            return Task.FromResult<ProjectDto?>(null);
        }

        var updated = existing with
        {
            Name = request.Name,
            Department = request.Department,
            Domain = request.Domain,
            IsActive = request.IsActive
        };

        _projects[projectId] = updated;
        return Task.FromResult<ProjectDto?>(updated);
    }
}
