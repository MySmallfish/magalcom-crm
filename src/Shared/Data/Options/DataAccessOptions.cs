namespace Magalcom.Crm.Shared.Data.Options;

public sealed class DataAccessOptions
{
    public const string SectionName = "DataAccess";

    public string Provider { get; set; } = "InMemory";
    public string ConnectionString { get; set; } = string.Empty;
}
