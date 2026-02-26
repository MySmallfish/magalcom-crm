using Magalcom.Crm.WebApp.Infrastructure;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks();

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
            mode = configuration["Shell:Authentication:Mode"] ?? "msal",
            disableAuthentication = configuration.GetValue<bool>("Shell:Authentication:DisableAuthentication"),
            tenantId = configuration["Shell:Authentication:Entra:TenantId"] ?? string.Empty,
            clientId = configuration["Shell:Authentication:Entra:SpaClientId"] ?? string.Empty,
            scope = configuration["Shell:Authentication:Entra:Scope"] ?? string.Empty
        },
        features = new
        {
            leadsModule = configuration.GetValue("Features:LeadsModule", true),
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
