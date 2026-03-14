namespace Magalcom.Crm.Shared.Contracts.Shell;

public static class ShellMessageTypes
{
    public const string ShellContext = "magalcom.shell.context";
    public const string ShellEvent = "magalcom.shell.event";
    public const string MiniAppCommand = "magalcom.miniapp.command";
}

public static class ShellMessageVersions
{
    public const string V1 = "v1";
}

public static class ShellCommandNames
{
    public const string Navigate = "navigate";
    public const string OpenProfile = "profile.open";
    public const string Logout = "auth.logout";
    public const string Notify = "shell.notify";
    public const string OpenMiniApp = "miniapp.open";
    public const string SetPageHeader = "shell.header.set";
    public const string ExecuteSqlQuery = "miniapp.sql.query.execute";
}

public static class ShellEventNames
{
    public const string ShellReady = "shell.ready";
    public const string RouteChanged = "shell.route.changed";
    public const string MiniAppCommandExecuted = "miniapp.command.executed";
    public const string MiniAppCommandFailed = "miniapp.command.failed";
    public const string MiniAppSqlQueryResult = "miniapp.sql.query.result";
    public const string MiniAppSqlQueryFailed = "miniapp.sql.query.failed";
    public const string CommandExecuting = "command.executing";
    public const string CommandExecuted = "command.executed";
    public const string CommandFailed = "command.failed";
}

public sealed record ShellEventMessageDto(
    string Type,
    string Version,
    string EventType,
    object? Payload);

public sealed record MiniAppCommandMessageDto(
    string Type,
    string Version,
    string Command,
    object? Payload);
