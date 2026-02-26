namespace Magalcom.Crm.WebApi.Configuration;

public sealed class MiniAppsOptions
{
    public const string SectionName = "MiniApps";

    public List<MiniAppOptionsItem> Items { get; set; } = [];
}

public sealed class MiniAppOptionsItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Origin { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public List<string> RequiredRoles { get; set; } = [];
}
