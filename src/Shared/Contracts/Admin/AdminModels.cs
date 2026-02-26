namespace Magalcom.Crm.Shared.Contracts.Admin;

public sealed record ProjectDto(
    Guid Id,
    string Name,
    string Department,
    string Domain,
    bool IsActive);

public sealed record UpdateProjectRequest(
    string Name,
    string Department,
    string Domain,
    bool IsActive);

public sealed record FormulaDto(
    Guid Id,
    string Name,
    string Expression,
    bool IsActive);

public sealed record UpdateFormulaRequest(
    string Name,
    string Expression,
    bool IsActive);
