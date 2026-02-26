namespace Magalcom.Crm.WebApi.Configuration;

public sealed class FeatureFlagsOptions
{
    public const string SectionName = "Features";

    public bool LeadsModule { get; set; } = true;
    public bool MiniAppsExternalOrigins { get; set; }
    public bool BiChatScaffold { get; set; } = true;
}
