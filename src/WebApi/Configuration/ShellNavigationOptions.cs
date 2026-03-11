namespace Magalcom.Crm.WebApi.Configuration;

public sealed class ShellNavigationOptions
{
    public const string SectionName = "Shell:Navigation";

    public List<ShellNavigationItemOptions> Items { get; set; } = [];
}

public sealed class ShellNavigationItemOptions
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public int Order { get; set; }
    public string? Icon { get; set; }
    public string? MiniAppId { get; set; }
    public List<string> RequiredRoles { get; set; } = [];
    public List<ShellNavigationItemOptions> Children { get; set; } = [];
}
