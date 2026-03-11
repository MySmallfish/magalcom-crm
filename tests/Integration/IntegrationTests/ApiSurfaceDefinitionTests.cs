using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Shell;

namespace Magalcom.Crm.Tests.Integration;

public sealed class ApiSurfaceDefinitionTests
{
    [Fact]
    public void ContractModels_ShouldBeConstructible()
    {
        var me = new UserContextDto("sub", "name", "email", ["Admin"]);
        var sitemap = new SitemapItemDto("home", "Home", "/", 1, "home", [], []);
        var miniApp = new MiniAppDescriptorDto("m1", "Mini", "/mini", "https://mini", "https://mini", true, []);
        var project = new ProjectDto(Guid.NewGuid(), "Project", "Sales", "CRM", true);
        var formula = new FormulaDto(Guid.NewGuid(), "Formula", "x+y", true);

        Assert.NotNull(me);
        Assert.NotNull(sitemap);
        Assert.NotNull(miniApp);
        Assert.NotNull(project);
        Assert.NotNull(formula);
    }
}
