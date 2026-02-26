using System.Security.Claims;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Contracts.Reports;
using Magalcom.Crm.Shared.Contracts.Shell;
using Magalcom.Crm.Shared.Data.InMemory;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.SqlServer;
using Magalcom.Crm.Shared.Messaging;
using Magalcom.Crm.WebApi.Configuration;
using Magalcom.Crm.WebApi.Hubs;
using Magalcom.Crm.WebApi.Infrastructure;
using Magalcom.Crm.WebApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection(FeatureFlagsOptions.SectionName));
builder.Services.Configure<MiniAppsOptions>(builder.Configuration.GetSection(MiniAppsOptions.SectionName));

builder.Services.AddCors(options =>
{
    options.AddPolicy("ShellSpa", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (allowedOrigins.Length == 0)
        {
            allowedOrigins = ["http://localhost:7001"];
        }

        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
    });
});

var authDisabled = builder.Configuration.GetValue<bool>("Authentication:DisableAuthentication");
if (!authDisabled)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            var tenantId = builder.Configuration["Authentication:Entra:TenantId"];
            var audience = builder.Configuration["Authentication:Entra:ApiClientId"];
            if (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("Authentication:Entra:TenantId and Authentication:Entra:ApiClientId are required when authentication is enabled.");
            }

            options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
            options.Audience = audience;
            options.MapInboundClaims = true;
        });
}
else
{
    builder.Services.AddAuthentication();
}

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

var provider = builder.Configuration.GetValue<string>("DataAccess:Provider") ?? "InMemory";
if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<ILeadDataService, SqlServerLeadDataService>();
    builder.Services.AddScoped<IProjectDataService, SqlServerProjectDataService>();
    builder.Services.AddScoped<IFormulaDataService, SqlServerFormulaDataService>();
}
else
{
    builder.Services.AddSingleton<ILeadDataService, InMemoryLeadDataService>();
    builder.Services.AddSingleton<IProjectDataService, InMemoryProjectDataService>();
    builder.Services.AddSingleton<IFormulaDataService, InMemoryFormulaDataService>();
}

builder.Services.AddSingleton<InMemoryMessageTransport>();
builder.Services.AddSingleton<ICommandPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IEventPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IBackgroundJobQueue>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<PredictionJobStore>();

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseCors("ShellSpa");

if (authDisabled)
{
    app.Use(async (context, next) =>
    {
        var claims = new List<Claim>
        {
            new("oid", "dev-user-001"),
            new(ClaimTypes.NameIdentifier, "dev-user-001"),
            new(ClaimTypes.Name, "Development User"),
            new(ClaimTypes.Email, "developer@magalcom.local"),
            new(ClaimTypes.Role, "Admin"),
            new(ClaimTypes.Role, "Sales")
        };

        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Development"));
        await next();
    });
}
else
{
    app.UseAuthentication();
}

app.UseAuthorization();

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");
app.MapHub<UpdatesHub>("/hubs/updates");

var api = app.MapGroup("/api/v1");
api.RequireAuthorization();

api.MapGet("/me", (ClaimsPrincipal user) =>
{
    var roles = user.Claims
        .Where(c => c.Type is "roles" or ClaimTypes.Role)
        .Select(c => c.Value)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    var subjectId = user.FindFirstValue("oid")
                    ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? "unknown";

    var displayName = user.Identity?.Name
                      ?? user.FindFirstValue("name")
                      ?? "Unknown User";

    var email = user.FindFirstValue("preferred_username")
                ?? user.FindFirstValue(ClaimTypes.Email)
                ?? "unknown@magalcom.local";

    return Results.Ok(new UserContextDto(subjectId, displayName, email, roles));
});

api.MapGet("/sitemap", (ClaimsPrincipal user, IOptions<FeatureFlagsOptions> flagsOptions) =>
{
    var flags = flagsOptions.Value;
    var roles = user.Claims
        .Where(c => c.Type is "roles" or ClaimTypes.Role)
        .Select(c => c.Value)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var items = new List<SitemapItemDto>
    {
        new(
            "home",
            "Home",
            "/",
            1,
            "home",
            [],
            []),
        new(
            "profile",
            "Profile",
            "/profile",
            2,
            "user",
            [],
            []),
        new(
            "mini-apps",
            "Mini Apps",
            "/mini-apps",
            3,
            "apps",
            [],
            []),
        new(
            "leads",
            "Leads",
            "/leads",
            4,
            "leads",
            ["Sales", "Admin"],
            [])
    };

    var filtered = items
        .Where(item =>
            item.RequiredRoles.Count == 0
            || item.RequiredRoles.Any(required => roles.Contains(required)))
        .OrderBy(item => item.Order)
        .ToArray();

    if (!flags.LeadsModule)
    {
        filtered = filtered.Where(item => !string.Equals(item.Id, "leads", StringComparison.OrdinalIgnoreCase)).ToArray();
    }

    return Results.Ok(filtered);
});

api.MapGet("/miniapps", (IOptions<MiniAppsOptions> options, ClaimsPrincipal user) =>
{
    var roles = user.Claims
        .Where(c => c.Type is "roles" or ClaimTypes.Role)
        .Select(c => c.Value)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var items = options.Value.Items
        .Where(item => item.Enabled)
        .Where(item => item.RequiredRoles.Count == 0 || item.RequiredRoles.Any(role => roles.Contains(role)))
        .Select(item => new MiniAppDescriptorDto(item.Id, item.Title, item.Route, item.Url, item.Origin, item.Enabled, item.RequiredRoles))
        .ToArray();

    return Results.Ok(items);
});

api.MapGet("/leads", async (ILeadDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetLeadsAsync(cancellationToken)));

api.MapGet("/leads/{id:guid}", async (Guid id, ILeadDataService service, CancellationToken cancellationToken) =>
{
    var lead = await service.GetLeadByIdAsync(id, cancellationToken);
    return lead is null ? Results.NotFound() : Results.Ok(lead);
});

api.MapPost("/leads", async (CreateLeadRequest request, ILeadDataService service, CancellationToken cancellationToken) =>
{
    var created = await service.AddLeadAsync(request, cancellationToken);
    return Results.Created($"/api/v1/leads/{created.Id}", created);
});

api.MapPut("/leads/{id:guid}", async (Guid id, UpdateLeadRequest request, ILeadDataService service, CancellationToken cancellationToken) =>
{
    var updated = await service.SaveLeadAsync(id, request, cancellationToken);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

api.MapPost("/reports/predictions/jobs", async (
    CreatePredictionJobRequest request,
    ClaimsPrincipal user,
    IBackgroundJobQueue queue,
    PredictionJobStore store,
    CancellationToken cancellationToken) =>
{
    var now = DateTime.UtcNow;
    var job = new PredictionJobDto(
        Guid.NewGuid(),
        PredictionJobStatus.Queued,
        now,
        null,
        null,
        null);

    store.Set(job);

    var metadata = new MessageMetadata(
        Guid.NewGuid(),
        Guid.NewGuid(),
        null,
        "magalcom",
        user.FindFirstValue("oid") ?? "unknown",
        now);

    var envelope = new MessageEnvelope<CreatePredictionJobRequest>(metadata, "prediction.job.requested.v1", request);
    await queue.EnqueueAsync(envelope, cancellationToken);

    return Results.Accepted($"/api/v1/reports/predictions/jobs/{job.JobId}", job);
});

api.MapGet("/reports/predictions/jobs/{jobId:guid}", (Guid jobId, PredictionJobStore store) =>
{
    var found = store.TryGet(jobId, out var job);
    return found ? Results.Ok(job) : Results.NotFound();
});

var admin = api.MapGroup("/admin").RequireAuthorization("AdminOnly");

admin.MapGet("/projects", async (IProjectDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetProjectsAsync(cancellationToken)));

admin.MapPut("/projects/{id:guid}", async (Guid id, UpdateProjectRequest request, IProjectDataService service, CancellationToken cancellationToken) =>
{
    var updated = await service.SaveProjectAsync(id, request, cancellationToken);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

admin.MapGet("/formulas", async (IFormulaDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetFormulasAsync(cancellationToken)));

admin.MapPut("/formulas/{id:guid}", async (Guid id, UpdateFormulaRequest request, IFormulaDataService service, CancellationToken cancellationToken) =>
{
    var updated = await service.SaveFormulaAsync(id, request, cancellationToken);
    return updated is null ? Results.NotFound() : Results.Ok(updated);
});

app.Run();
