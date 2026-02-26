namespace Magalcom.Crm.Shared.Contracts.Shell;

public sealed record SitemapItemDto(
    string Id,
    string Title,
    string Route,
    int Order,
    string? Icon,
    IReadOnlyCollection<string> RequiredRoles,
    IReadOnlyCollection<SitemapItemDto> Children);
