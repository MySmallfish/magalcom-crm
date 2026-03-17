using System.Security.Claims;
using System.Text.Json.Serialization;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Contracts.Identity;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Contracts.Shell;
using Magalcom.Crm.Shared.Data.InMemory;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer;
using Magalcom.Crm.Shared.Messaging;
using Magalcom.Crm.WebApi.Configuration;
using Magalcom.Crm.WebApi.Hubs;
using Magalcom.Crm.WebApi.Infrastructure;
using Magalcom.Crm.WebApi.Leads;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

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
    builder.Services.AddScoped<ILeadDataService, SqlServerLeadDataService>();
    builder.Services.AddScoped<IStatisticsReportDataService, SqlServerStatisticsReportDataService>();
    builder.Services.AddScoped<IProjectDataService, SqlServerProjectDataService>();
    builder.Services.AddScoped<IFormulaDataService, SqlServerFormulaDataService>();
    builder.Services.AddScoped<ISqlQueryService, SqlServerSqlQueryService>();
}
else
{
    builder.Services.AddSingleton<ILeadDataService, InMemoryLeadDataService>();
    builder.Services.AddSingleton<IStatisticsReportDataService, InMemoryStatisticsReportDataService>();
    builder.Services.AddSingleton<IProjectDataService, InMemoryProjectDataService>();
    builder.Services.AddSingleton<IFormulaDataService, InMemoryFormulaDataService>();
    builder.Services.AddSingleton<ISqlQueryService, InMemorySqlQueryService>();
}

builder.Services.AddSingleton<InMemoryMessageTransport>();
builder.Services.AddSingleton<ICommandPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IEventPublisher>(sp => sp.GetRequiredService<InMemoryMessageTransport>());
builder.Services.AddSingleton<IBackgroundJobQueue>(sp => sp.GetRequiredService<InMemoryMessageTransport>());

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseCors("ShellSpa");
app.UseExceptionHandler(handler =>
{
    handler.Run(async context =>
    {
        var exceptionFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var logger = context.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("Magalcom.Crm.WebApi.Exceptions");

        if (exceptionFeature?.Error is not null)
        {
            logger.LogError(
                exceptionFeature.Error,
                "Unhandled exception for {Method} {Path}.",
                context.Request.Method,
                context.Request.Path);
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";

        await Results.Problem(
            statusCode: StatusCodes.Status500InternalServerError,
            title: "Server error",
            detail: app.Environment.IsDevelopment()
                ? exceptionFeature?.Error.Message
                : "An unexpected server error occurred.")
            .ExecuteAsync(context);
    });
});
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");
app.MapHub<UpdatesHub>("/hubs/updates").RequireAuthorization("CrmUser");

var api = app.MapGroup("/api/v1");
api.RequireAuthorization("CrmUser");

api.MapGet("/me", (HttpContext httpContext) =>
{
    try
    {
        return Results.Ok(BuildUserContext(httpContext.User));
    }
    catch (Exception exception)
    {
        var logger = httpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("Magalcom.Crm.WebApi.MeEndpoint");

        logger.LogError(
            exception,
            "Failed to build /api/v1/me response. Claim types: {ClaimTypes}",
            httpContext.User.Claims.Select(claim => claim.Type).Distinct().ToArray());

        return Results.Problem(
            statusCode: StatusCodes.Status500InternalServerError,
            title: "Failed to build user context",
            detail: app.Environment.IsDevelopment() ? exception.Message : null);
    }
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
        .Select(item => new MiniAppDescriptorDto(item.Id, item.Title, item.Route, item.Url, item.Origin, item.Enabled, item.UseFullScreenLayout, item.RequiredRoles))
        .ToArray();

    return Results.Ok(items);
});

api.MapGet("/leads/metadata", async (ILeadDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetMetadataAsync(cancellationToken)));

api.MapGet("/leads", async (ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetLeadsAsync(ResolveLeadQueryScope(user), cancellationToken)));

api.MapGet("/leads/export", async ([AsParameters] LeadExportQuery query, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    var leads = LeadExportWorkbookBuilder.ApplyQuery(await service.GetLeadsAsync(ResolveLeadQueryScope(user), cancellationToken), query);
    var workbookBytes = LeadExportWorkbookBuilder.BuildWorkbook(leads, query);
    return Results.File(
        workbookBytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        LeadExportWorkbookBuilder.BuildFileName(query));
});

api.MapGet("/statistics-report", async ([AsParameters] SalesMonthlyReportQuery query, ClaimsPrincipal user, IStatisticsReportDataService service, CancellationToken cancellationToken) =>
{
    if (!query.FromDate.HasValue || !query.ToDate.HasValue)
    {
        return Results.BadRequest(new { error = "fromDate and toDate are required." });
    }

    if (query.FromDate.Value > query.ToDate.Value)
    {
        return Results.BadRequest(new { error = "fromDate must be earlier than or equal to toDate." });
    }

    var entries = await service.GetEntriesAsync(ResolveLeadQueryScope(user), cancellationToken);
    var report = SalesMonthlyReportBuilder.Build(entries, query);
    return Results.Ok(report);
});

api.MapGet("/statistics-report/export", async ([AsParameters] SalesMonthlyReportQuery query, ClaimsPrincipal user, IStatisticsReportDataService service, CancellationToken cancellationToken) =>
{
    if (!query.FromDate.HasValue || !query.ToDate.HasValue)
    {
        return Results.BadRequest(new { error = "fromDate and toDate are required." });
    }

    if (query.FromDate.Value > query.ToDate.Value)
    {
        return Results.BadRequest(new { error = "fromDate must be earlier than or equal to toDate." });
    }

    var entries = await service.GetEntriesAsync(ResolveLeadQueryScope(user), cancellationToken);
    var report = SalesMonthlyReportBuilder.Build(entries, query);
    var workbookBytes = SalesMonthlyReportWorkbookBuilder.BuildWorkbook(report, query);
    return Results.File(
        workbookBytes,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        SalesMonthlyReportWorkbookBuilder.BuildFileName(query));
});

api.MapGet("/leads/{id:guid}", async (Guid id, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    var lead = await service.GetLeadByIdAsync(id, ResolveLeadQueryScope(user), cancellationToken);
    return lead is null ? Results.NotFound() : Results.Ok(lead);
});

api.MapPost("/leads", async (CreateLeadRequest request, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    try
    {
        var created = await service.AddLeadAsync(request, ResolveLeadActor(user), cancellationToken);
        return Results.Created($"/api/v1/leads/{created.Id}", created);
    }
    catch (ArgumentException error)
    {
        return Results.BadRequest(new { error = error.Message });
    }
});

api.MapPut("/leads/{id:guid}", async (Guid id, UpdateLeadRequest request, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    try
    {
        var scope = ResolveLeadQueryScope(user);
        var existing = await service.GetLeadByIdAsync(id, scope, cancellationToken);
        if (existing is null)
        {
            return Results.NotFound();
        }

        var updated = await service.SaveLeadAsync(id, request, ResolveLeadActor(user), cancellationToken);
        return updated is null ? Results.NotFound() : Results.Ok(updated);
    }
    catch (ArgumentException error)
    {
        return Results.BadRequest(new { error = error.Message });
    }
});
var admin = api.MapGroup("/admin").RequireAuthorization("AdminOnly");

admin.MapGet("/work-types", async (ILeadDataService service, CancellationToken cancellationToken) =>
    Results.Ok(await service.GetWorkTypesAsync(cancellationToken)));

admin.MapPost("/work-types", async (CreateWorkTypeRequest request, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    try
    {
        var created = await service.AddWorkTypeAsync(request, ResolveLeadActor(user), cancellationToken);
        return Results.Created($"/api/v1/admin/work-types/{created.Id}", created);
    }
    catch (ArgumentException error)
    {
        return Results.BadRequest(new { error = error.Message });
    }
});

admin.MapPut("/work-types/{id:guid}", async (Guid id, UpdateWorkTypeRequest request, ClaimsPrincipal user, ILeadDataService service, CancellationToken cancellationToken) =>
{
    try
    {
        var updated = await service.SaveWorkTypeAsync(id, request, ResolveLeadActor(user), cancellationToken);
        return updated is null ? Results.NotFound() : Results.Ok(updated);
    }
    catch (ArgumentException error)
    {
        return Results.BadRequest(new { error = error.Message });
    }
});

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

admin.MapPost("/sql/query", async (SqlQueryRequest request, ISqlQueryService service, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Sql))
    {
        return Results.BadRequest("SQL is required.");
    }

    SqlQueryResult response;
    try
    {
        response = await service.ExecuteAsync(request, cancellationToken);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(ex.Message);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(ex.Message);
    }

    if (response.RequiresWriteConsent)
    {
        return Results.Conflict(response);
    }

    return Results.Ok(response);
});

static LeadOwnerDto ResolveLeadActor(ClaimsPrincipal user)
{
    var subjectId = user.FindFirstValue("oid")
                    ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? "unknown";

    var displayName = user.Identity?.Name
                      ?? user.FindFirstValue("name")
                      ?? "Unknown User";

    var email = user.FindFirstValue("preferred_username")
                ?? user.FindFirstValue(ClaimTypes.Email)
                ?? "unknown@magalcom.local";

    return new LeadOwnerDto(subjectId, displayName, email);
}

static LeadQueryScope ResolveLeadQueryScope(ClaimsPrincipal user)
{
    var subjectId = user.FindFirstValue("oid")
                    ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

    var canViewAll = user.Claims.Any(claim =>
        (claim.Type is "roles" or ClaimTypes.Role)
        && string.Equals(claim.Value, "Admin", StringComparison.OrdinalIgnoreCase));

    return LeadQueryScope.ForUser(subjectId, canViewAll);
}

app.Run();

static bool IsConfigured(string? value)
{
    return !string.IsNullOrWhiteSpace(value) && !value.StartsWith("REPLACE_WITH_", StringComparison.OrdinalIgnoreCase);
}

static UserContextDto BuildUserContext(ClaimsPrincipal user)
{
    var roles = user.Claims
        .Where(c => c.Type is "roles" or ClaimTypes.Role)
        .Select(c => c.Value)
        .Where(value => !string.IsNullOrWhiteSpace(value))
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

    return new UserContextDto(subjectId, displayName, email, roles);
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

public partial class Program
{
}
