using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Magalcom.Crm.Shared.Contracts.Leads;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Text.Encodings.Web;
using Magalcom.Crm.Shared.Data.InMemory;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Tests.Integration;

public sealed class LeadApiFlowTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly WebApplicationFactory<Program> _factory;

    public LeadApiFlowTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["DataAccess:Provider"] = "InMemory"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<ILeadDataService>();
                services.AddSingleton<ILeadDataService, InMemoryLeadDataService>();

                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
                    options.DefaultScheme = TestAuthHandler.SchemeName;
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            });
        });
    }

    [Fact]
    public async Task LeadEndpoints_ShouldCreateUpdateAndReturnPersistedResults()
    {
        using var client = _factory.CreateClient();

        using var metadataResponse = await client.GetAsync("/api/v1/leads/metadata");
        var metadataPayload = await metadataResponse.Content.ReadAsStringAsync();
        Assert.True(metadataResponse.IsSuccessStatusCode, metadataPayload);
        var metadata = JsonSerializer.Deserialize<LeadModuleMetadataDto>(metadataPayload, JsonOptions);
        Assert.NotNull(metadata);

        var customer = metadata!.Customers.First();
        var detection = metadata.WorkTypes.First(item => item.Code == "DETECT");
        var software = metadata.WorkTypes.First(item => item.Code == "SOFT");

        var createRequest = new CreateLeadRequest(
            customer.Id,
            null,
            "API Flow Opportunity",
            "Created from the integration test.",
            new[]
            {
                new LeadQualificationAnswerRequest("knows-customer-personally", true),
                new LeadQualificationAnswerRequest("returning-customer", true),
                new LeadQualificationAnswerRequest("involved-in-planning", true),
                new LeadQualificationAnswerRequest("consultant-relationship", false),
                new LeadQualificationAnswerRequest("project-management-relationship", true),
                new LeadQualificationAnswerRequest("customer-under-price-list", false)
            },
            LeadStage.Approaching,
            false,
            new DateOnly(2026, 4, 20),
            LeadOfferStatus.Open,
            null,
            new[]
            {
                new LeadAmountLineRequest(null, detection.Id, 80000m, "Detection scope"),
                new LeadAmountLineRequest(null, software.Id, 20000m, "Software scope")
            });

        using var createResponse = await client.PostAsJsonAsync("/api/v1/leads", createRequest, JsonOptions);
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<LeadDto>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal(100000m, created!.Metrics.TotalAmount);
        Assert.Equal(39000m, created.Metrics.ForecastAmount);
        Assert.Equal("API Flow Opportunity", created.Project.Name);

        var updateRequest = new UpdateLeadRequest(
            created.Customer.Id,
            created.Project.Id,
            created.Project.Name,
            "Updated from the integration test.",
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
            102000m,
            new[]
            {
                new LeadAmountLineRequest(created.AmountLines.First().Id, detection.Id, 90000m, "Expanded detection scope"),
                new LeadAmountLineRequest(null, software.Id, 30000m, "Expanded software scope")
            });

        using var updateResponse = await client.PutAsJsonAsync($"/api/v1/leads/{created.Id}", updateRequest, JsonOptions);
        updateResponse.EnsureSuccessStatusCode();

        var updated = await updateResponse.Content.ReadFromJsonAsync<LeadDto>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Updated from the integration test.", updated!.Comments);
        Assert.Equal(LeadOfferStatus.Win, updated.OfferStatus);
        Assert.Equal(120000m, updated.Metrics.TotalAmount);
        Assert.Equal(120000m, updated.Metrics.ForecastAmount);
        Assert.Equal(102000m, updated.Metrics.WonAmount);

        var fetched = await client.GetFromJsonAsync<LeadDto>($"/api/v1/leads/{created.Id}", JsonOptions);
        Assert.NotNull(fetched);
        Assert.Equal(updated.Id, fetched!.Id);
        Assert.Equal(updated.Project.Name, fetched.Project.Name);
        Assert.Equal(updated.Metrics.ForecastAmount, fetched.Metrics.ForecastAmount);
        Assert.Contains(fetched.AuditTrail, entry => entry.Action == "Updated");
    }
}

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "IntegrationTestAuth";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim("oid", "integration-user-001"),
            new Claim("name", "Integration Tester"),
            new Claim("preferred_username", "integration@magalcom.local"),
            new Claim(ClaimTypes.Role, "CrmUser"),
            new Claim(ClaimTypes.Role, "Admin")
        };

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
