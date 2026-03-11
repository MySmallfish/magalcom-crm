using System.Text.Json;

namespace Magalcom.Crm.Tests.Contract;

public sealed class JsonContractFilesTests
{
    [Theory]
    [InlineData("docs/contracts/shell-context.v1.json", "magalcom.shell.context.v1")]
    [InlineData("docs/contracts/sitemap.v1.json", "magalcom.sitemap.v1")]
    [InlineData("docs/contracts/shell-event.v1.json", "magalcom.shell.event.v1")]
    [InlineData("docs/contracts/miniapp-command.v1.json", "magalcom.miniapp.command.v1")]
    public void ContractFile_ShouldContainSchemaId(string path, string expectedId)
    {
        var root = ResolveRepositoryRoot();
        var fullPath = Path.Combine(root, path);

        Assert.True(File.Exists(fullPath), $"File missing: {fullPath}");

        using var stream = File.OpenRead(fullPath);
        using var document = JsonDocument.Parse(stream);
        var id = document.RootElement.GetProperty("$id").GetString();

        Assert.Equal(expectedId, id);
    }

    private static string ResolveRepositoryRoot()
    {
        var current = AppContext.BaseDirectory;
        var directory = new DirectoryInfo(current);

        while (directory is not null)
        {
            if (directory.GetDirectories("docs").Any())
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Repository root not found.");
    }
}
