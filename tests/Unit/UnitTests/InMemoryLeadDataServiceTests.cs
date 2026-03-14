using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.InMemory;

namespace Magalcom.Crm.Tests.Unit;

public sealed class InMemoryLeadDataServiceTests
{
    private static readonly LeadOwnerDto Actor = new("dev-user-001", "Development User", "developer@magalcom.local");

    [Fact]
    public async Task AddLead_ShouldCreateCalculatedLeadAndCustomerScopedProject()
    {
        var service = new InMemoryLeadDataService();
        var metadata = await service.GetMetadataAsync();
        var customer = metadata.Customers.First();
        var dataCenter = metadata.WorkTypes.First(item => item.Code == "DataCenter");
        var communications = metadata.WorkTypes.First(item => item.Code == "Communications");

        var created = await service.AddLeadAsync(
            new CreateLeadRequest(
                customer.Id,
                null,
                "Command Center Expansion",
                "New opportunity captured from the CRM customer workspace.",
                new[]
                {
                    new LeadQualificationAnswerRequest("knows-customer-personally", true),
                    new LeadQualificationAnswerRequest("returning-customer", true),
                    new LeadQualificationAnswerRequest("involved-in-planning", true),
                    new LeadQualificationAnswerRequest("consultant-relationship", false),
                    new LeadQualificationAnswerRequest("project-management-relationship", true),
                    new LeadQualificationAnswerRequest("customer-under-price-list", false)
                },
                LeadStage.Sent,
                false,
                new DateOnly(2026, 4, 15),
                LeadOfferStatus.Open,
                null,
                new[]
                {
                    new LeadAmountLineRequest(null, dataCenter.Id, 150000m, "Data center package"),
                    new LeadAmountLineRequest(null, communications.Id, 50000m, "Communications integration")
                }),
            Actor);

        Assert.Equal(customer.Id, created.Customer.Id);
        Assert.Equal("Command Center Expansion", created.Project.Name);
        Assert.Equal(200000m, created.Metrics.TotalAmount);
        Assert.Equal(80m, created.Metrics.QualificationScore);
        Assert.Equal(24m, created.Metrics.QualificationContribution);
        Assert.Equal(30m, created.Metrics.StageContribution);
        Assert.Equal(54m, created.Metrics.ChanceToWin);
        Assert.Equal(108000m, created.Metrics.ForecastAmount);
        Assert.Equal(108000m, created.Metrics.HighConfidenceForecastAmount);
        Assert.False(created.IsIncomplete);
        Assert.Empty(created.MissingFields);
        Assert.Equal(2, created.AmountTotalsByWorkType.Count);
    }

    [Fact]
    public async Task SaveLead_ShouldUpdateEditableFieldsAndRecalculateResults()
    {
        var service = new InMemoryLeadDataService();
        var metadata = await service.GetMetadataAsync();
        var current = (await service.GetLeadsAsync()).First();
        var security = metadata.WorkTypes.First(item => item.Code == "Security");
        var safety = metadata.WorkTypes.First(item => item.Code == "Safety");

        var updated = await service.SaveLeadAsync(
            current.Id,
            new UpdateLeadRequest(
                current.Customer.Id,
                current.Project.Id,
                current.Project.Name,
                "Lead updated after the customer requested a revised scope.",
                new[]
                {
                    new LeadQualificationAnswerRequest("knows-customer-personally", true),
                    new LeadQualificationAnswerRequest("returning-customer", true),
                    new LeadQualificationAnswerRequest("involved-in-planning", true),
                    new LeadQualificationAnswerRequest("consultant-relationship", true),
                    new LeadQualificationAnswerRequest("project-management-relationship", true),
                    new LeadQualificationAnswerRequest("customer-under-price-list", true)
                },
                LeadStage.Sent,
                true,
                new DateOnly(2026, 5, 1),
                LeadOfferStatus.Win,
                260000m,
                new[]
                {
                    new LeadAmountLineRequest(current.AmountLines.First().Id, security.Id, 180000m, "Security refresh"),
                    new LeadAmountLineRequest(null, safety.Id, 90000m, "Safety package")
                }),
            Actor);

        Assert.NotNull(updated);
        Assert.Equal("Lead updated after the customer requested a revised scope.", updated!.Comments);
        Assert.True(updated.IsPerpetual);
        Assert.Equal(LeadOfferStatus.Win, updated.OfferStatus);
        Assert.Equal(270000m, updated.Metrics.TotalAmount);
        Assert.Equal(100m, updated.Metrics.QualificationScore);
        Assert.Equal(270000m, updated.Metrics.ForecastAmount);
        Assert.Equal(270000m, updated.Metrics.HighConfidenceForecastAmount);
        Assert.Equal(260000m, updated.Metrics.WonAmount);
        Assert.False(updated.IsIncomplete);
        Assert.Contains(updated.AuditTrail, entry => entry.Action == "Updated");
    }
}
