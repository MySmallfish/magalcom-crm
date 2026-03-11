using Magalcom.Crm.Backend.Infrastructure;
using Magalcom.Crm.Backend.Services;
using Magalcom.Crm.Shared.Data.InMemory;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer;
using Magalcom.Crm.Shared.Messaging;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "Magalcom CRM Backend";
});

builder.Services.AddHealthChecks();
builder.Services.Configure<DataAccessOptions>(builder.Configuration.GetSection(DataAccessOptions.SectionName));
builder.Services.AddSingleton(sp => sp.GetRequiredService<IOptions<DataAccessOptions>>().Value);

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

builder.Services.AddHostedService<ScheduledImportWorker>();

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapGet("/", () => Results.Ok(new
{
    service = "Magalcom.Crm.Backend",
    utcNow = DateTime.UtcNow,
    status = "running"
}));

app.Run();
