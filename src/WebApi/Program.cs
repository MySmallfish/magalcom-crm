using System.Security.Claims;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Shell;
using Magalcom.Crm.Shared.Data.InMemory;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer;
using Magalcom.Crm.Shared.Messaging;
using Magalcom.Crm.WebApi.Configuration;
using Magalcom.Crm.WebApi.Hubs;
using Magalcom.Crm.WebApi.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

builder.Services.Configure<FeatureFlagsOptions>(builder.Configuration.GetSection(FeatureFlagsOptions.SectionName));
builder.Services.Configure<MiniAppsOptions>(builder.Configuration.GetSection(MiniAppsOptions.SectionName));
builder.Services.Configure<ShellNavigationOptions>(builder.Configuration.GetSection(ShellNavigationOptions.SectionName));
builder.Services.Configure<DataAccessOptions>(builder.Configuration.GetSection(DataAccessOptions.SectionName));
builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<DataAccessOptions>>().Value);

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

var tenantId = builder.Configuration["Authentication:Entra:TenantId"];
var apiClientId = builder.Configuration["Authentication:Entra:ApiClientId"];
var audience = builder.Configuration["Authentication:Entra:Audience"];
if (!IsConfigured(tenantId) || !IsConfigured(apiClientId) || !IsConfigured(audience))
{
    throw new InvalidOperationException("Authentication:Entra:TenantId, ApiClientId, and Audience must be configured in appsettings.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
{
        options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
        options.IncludeErrorDetails = builder.Environment.IsDevelopment();
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers =
            [
                $"https://login.microsoftonline.com/{tenantId}/v2.0",
                $"https://sts.windows.net/{tenantId}/"
            ],
            ValidAudiences = [apiClientId, audience],
            NameClaimType = "name",
            RoleClaimType = "roles"
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrWhiteSpace(accessToken)
                    && context.HttpContext.Request.Path.StartsWithSegments("/hubs/updates"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("Magalcom.Crm.WebApi.Authentication");

                logger.LogError(
                    context.Exception,
                    "JWT authentication failed for {Path}.",
                    context.HttpContext.Request.Path);

                context.NoResult();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("CrmUser", policy => policy.RequireRole("CrmUser", "Admin"));
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

var provider = builder.Configuration.GetValue<string>("DataAccess:Provider") ?? "InMemory";
if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddScoped<IProjectDataService, SqlServerProjectDataService>();
    builder.Services.AddScoped<IFormulaDataService, SqlServerFormulaDataService>();
}
else
{
    builder.Services.AddSingleton<IProjectDataService, InMemoryProjectDataService>();
    builder.Services.AddSingleton<IFormulaDataService, InMemoryFormulaDataService>();
}

builder.Services.AddSingleton<InMemoryMessageTransport>();
builder.Services.AddSingleton<ICommandPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IEventPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IBackgroundJobQueue>(sp => sp.GetRequiredService<InMemoryMessageTransport>());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseCors("ShellSpa");
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");
app.MapHub<UpdatesHub>("/hubs/updates").RequireAuthorization("CrmUser");

var api = app.MapGroup("/api/v1");
api.RequireAuthorization("CrmUser");

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
                      ?? string.Empty;

    var email = user.FindFirstValue("preferred_username")
                ?? user.FindFirstValue("upn")
                ?? user.FindFirstValue("unique_name")
                ?? user.FindFirstValue(ClaimTypes.Email)
                ?? string.Empty;

    return Results.Ok(new UserContextDto(subjectId, displayName, email, roles));
});

api.MapGet("/sitemap", (ClaimsPrincipal user, IOptions<ShellNavigationOptions> navigationOptions, IOptions<MiniAppsOptions> miniAppsOptions) =>
{
    var roles = user.Claims
        .Where(c => c.Type is "roles" or ClaimTypes.Role)
        .Select(c => c.Value)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var availableMiniApps = miniAppsOptions.Value.Items
        .Where(item => item.Enabled)
        .Where(item => item.RequiredRoles.Count == 0 || item.RequiredRoles.Any(role => roles.Contains(role)))
        .ToDictionary(item => item.Id, StringComparer.OrdinalIgnoreCase);

    var items = BuildSitemap(navigationOptions.Value.Items, availableMiniApps, roles);
    return Results.Ok(items);
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

static bool IsConfigured(string? value)
{
    return !string.IsNullOrWhiteSpace(value) && !value.StartsWith("REPLACE_WITH_", StringComparison.OrdinalIgnoreCase);
}

static SitemapItemDto[] BuildSitemap(
    IEnumerable<ShellNavigationItemOptions> items,
    IReadOnlyDictionary<string, MiniAppOptionsItem> availableMiniApps,
    ISet<string> roles)
{
    return items
        .Select(item => BuildSitemapItem(item, availableMiniApps, roles))
        .Where(item => item is not null)
        .Cast<SitemapItemDto>()
        .OrderBy(item => item.Order)
        .ToArray();
}

static SitemapItemDto? BuildSitemapItem(
    ShellNavigationItemOptions item,
    IReadOnlyDictionary<string, MiniAppOptionsItem> availableMiniApps,
    ISet<string> roles)
{
    if (item.RequiredRoles.Count > 0 && !item.RequiredRoles.Any(role => roles.Contains(role)))
    {
        return null;
    }

    string resolvedTitle = item.Title;
    string resolvedRoute = item.Route;

    if (!string.IsNullOrWhiteSpace(item.MiniAppId))
    {
        if (!availableMiniApps.TryGetValue(item.MiniAppId, out var miniApp))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(resolvedTitle))
        {
            resolvedTitle = miniApp.Title;
        }

        if (string.IsNullOrWhiteSpace(resolvedRoute))
        {
            resolvedRoute = miniApp.Route;
        }
    }

    if (string.IsNullOrWhiteSpace(item.Id) || string.IsNullOrWhiteSpace(resolvedTitle) || string.IsNullOrWhiteSpace(resolvedRoute))
    {
        return null;
    }

    var children = BuildSitemap(item.Children, availableMiniApps, roles);
    return new SitemapItemDto(item.Id, resolvedTitle, resolvedRoute, item.Order, item.Icon, item.RequiredRoles, children);
}
