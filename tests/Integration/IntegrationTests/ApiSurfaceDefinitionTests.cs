using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Contracts.Reports;
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
        var lead = new LeadDto(Guid.NewGuid(), "Lead", "Customer", "Sales", "CRM", "User", Guid.NewGuid(), 100m, LeadStatus.Open, DateTime.UtcNow, DateTime.UtcNow);
        var project = new ProjectDto(Guid.NewGuid(), "Project", "Sales", "CRM", true);
        var formula = new FormulaDto(Guid.NewGuid(), "Formula", "x+y", true);
        var prediction = new PredictionJobDto(Guid.NewGuid(), PredictionJobStatus.Queued, DateTime.UtcNow, null, null, null);

        Assert.NotNull(me);
        Assert.NotNull(sitemap);
        Assert.NotNull(miniApp);
        Assert.NotNull(lead);
        Assert.NotNull(project);
        Assert.NotNull(formula);
        Assert.NotNull(prediction);
    }
}
