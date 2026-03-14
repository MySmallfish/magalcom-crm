using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Contracts.Shell;

namespace Magalcom.Crm.Tests.Integration;

public sealed class ApiSurfaceDefinitionTests
{
    [Fact]
    public void ContractModels_ShouldBeConstructible()
    {
        var me = new UserContextDto("sub", "name", "email", ["Admin"]);
        var sitemap = new SitemapItemDto("home", "Home", "/", 1, "home", [], []);
        var miniApp = new MiniAppDescriptorDto("m1", "Mini", "/mini", "https://mini", "https://mini", true, false, []);
        var lead = new LeadDto(
            Guid.NewGuid(),
            new LeadOwnerDto("sub", "name", "email"),
            new LeadCustomerDto(Guid.NewGuid(), "Customer", "CRM-001"),
            new LeadProjectDto(Guid.NewGuid(), Guid.NewGuid(), "Project", true),
            "Comments",
            [new LeadQualificationAnswerDto("knows-customer-personally", true)],
            LeadStage.Sent,
            false,
            DateOnly.FromDateTime(DateTime.UtcNow),
            LeadOfferStatus.Open,
            null,
            [new LeadAmountLineDto(Guid.NewGuid(), Guid.NewGuid(), "DataCenter", "Data Center", 100m, "Note")],
            new LeadMetricsDto(100m, 15m, 4.5m, 30m, 34.5m, 34.5m, 0m, 0m),
            false,
            [],
            [new LeadWorkTypeTotalDto(Guid.NewGuid(), "DataCenter", "Data Center", 100m)],
            [new LeadAuditEntryDto(DateTime.UtcNow, "name", "Created", "Lead created")],
            DateTime.UtcNow,
            DateTime.UtcNow);
        var project = new ProjectDto(Guid.NewGuid(), "Project", "Sales", "CRM", true);
        var formula = new FormulaDto(Guid.NewGuid(), "Formula", "x+y", true);

        Assert.NotNull(me);
        Assert.NotNull(sitemap);
        Assert.NotNull(miniApp);
        Assert.NotNull(lead);
        Assert.NotNull(project);
        Assert.NotNull(formula);
    }
}
