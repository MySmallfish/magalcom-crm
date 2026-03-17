namespace Magalcom.Crm.Shared.Data.Interfaces;

public sealed record LeadQueryScope(
    string? SubjectId,
    bool CanViewAll)
{
    public static LeadQueryScope All { get; } = new(null, true);

    public static LeadQueryScope ForUser(string? subjectId, bool canViewAll = false) =>
        new(subjectId, canViewAll);
}
