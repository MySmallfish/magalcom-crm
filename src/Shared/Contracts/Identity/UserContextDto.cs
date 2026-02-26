namespace Magalcom.Crm.Shared.Contracts.Identity;

public sealed record UserContextDto(
    string SubjectId,
    string DisplayName,
    string Email,
    IReadOnlyCollection<string> Roles);
