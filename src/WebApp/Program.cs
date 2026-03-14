using Magalcom.Crm.WebApp.Infrastructure;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

var shellTenantId = builder.Configuration["Shell:Authentication:Entra:TenantId"];
var shellSpaClientId = builder.Configuration["Shell:Authentication:Entra:SpaClientId"];
var shellScope = builder.Configuration["Shell:Authentication:Entra:Scope"];
if (!IsConfigured(shellTenantId) || !IsConfigured(shellSpaClientId) || !IsConfigured(shellScope))
{
    throw new InvalidOperationException("Shell:Authentication:Entra:TenantId, SpaClientId, and Scope must be configured in appsettings.");
}

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();

var shellSpaCandidates = new[]
{
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "Frontend", "ShellSpa")),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "Frontend", "ShellSpa")),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "wwwroot"))
};

var shellSpaPath = shellSpaCandidates.FirstOrDefault(Directory.Exists);
if (shellSpaPath is null)
{
    throw new DirectoryNotFoundException($"Shell SPA directory not found in known paths: {string.Join(", ", shellSpaCandidates)}");
}

var appsCandidates = new[]
{
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "apps")),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "apps"))
};

var appsPath = appsCandidates.FirstOrDefault(Directory.Exists);

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(shellSpaPath),
    RequestPath = ""
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(shellSpaPath),
    RequestPath = ""
});

if (appsPath is not null)
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(appsPath),
        RequestPath = "/apps"
    });
}

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapGet("/shell/config", (IConfiguration configuration) =>
{
    var payload = new
    {
        apiBaseUrl = configuration["Shell:ApiBaseUrl"] ?? "http://localhost:7002",
        environment = app.Environment.EnvironmentName,
        authentication = new
        {
            mode = configuration["Shell:Authentication:Mode"] ?? "entra",
            tenantId = configuration["Shell:Authentication:Entra:TenantId"] ?? string.Empty,
            clientId = configuration["Shell:Authentication:Entra:SpaClientId"] ?? string.Empty,
            scope = configuration["Shell:Authentication:Entra:Scope"] ?? string.Empty,
            redirectUri = configuration["Shell:Authentication:Entra:RedirectUri"] ?? string.Empty,
            postLogoutRedirectUri = configuration["Shell:Authentication:Entra:PostLogoutRedirectUri"] ?? string.Empty
        },
        features = new
        {
            miniAppsExternalOrigins = configuration.GetValue<bool>("Features:MiniAppsExternalOrigins"),
            biChatScaffold = configuration.GetValue("Features:BiChatScaffold", true)
        },
        miniApps = new
        {
            allowedOrigins = configuration.GetSection("MiniApps:AllowedOrigins").Get<string[]>() ?? []
        }
    };

    return Results.Ok(payload);
});

app.MapFallback(async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync(Path.Combine(shellSpaPath, "index.html"));
});

app.Run();

static bool IsConfigured(string? value)
{
    return !string.IsNullOrWhiteSpace(value) && !value.StartsWith("REPLACE_WITH_", StringComparison.OrdinalIgnoreCase);
}
