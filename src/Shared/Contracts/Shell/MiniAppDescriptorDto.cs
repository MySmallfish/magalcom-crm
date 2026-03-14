namespace Magalcom.Crm.Shared.Contracts.Shell;

public sealed record MiniAppDescriptorDto(
    string Id,
    string Title,
    string Route,
    string Url,
    string Origin,
    bool Enabled,
    bool UseFullScreenLayout,
    IReadOnlyCollection<string> RequiredRoles);
