using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.InMemory;

namespace Magalcom.Crm.Tests.Unit;

public sealed class InMemoryLeadDataServiceTests
{
    [Fact]
    public async Task AddLead_ShouldCreateDraftLead()
    {
        var service = new InMemoryLeadDataService();

        var created = await service.AddLeadAsync(new CreateLeadRequest(
            "Lead A",
            "Acme",
            "Sales",
            "CRM",
            "Bob",
            Guid.NewGuid(),
            1200m));

        Assert.Equal(LeadStatus.Draft, created.Status);
        Assert.Equal("Lead A", created.Title);
    }

    [Fact]
    public async Task SaveLead_ShouldUpdateExistingLead()
    {
        var service = new InMemoryLeadDataService();
        var current = (await service.GetLeadsAsync()).First();

        var updated = await service.SaveLeadAsync(current.Id, new UpdateLeadRequest(
            "Lead Updated",
            "Acme 2",
            "Sales",
            "CRM",
            "Jane",
            current.ProjectId,
            1500m,
            LeadStatus.Qualified));

        Assert.NotNull(updated);
        Assert.Equal("Lead Updated", updated!.Title);
        Assert.Equal(LeadStatus.Qualified, updated.Status);
    }
}
