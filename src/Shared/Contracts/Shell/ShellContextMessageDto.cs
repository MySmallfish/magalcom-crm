namespace Magalcom.Crm.Shared.Contracts.Shell;

public sealed record ShellContextMessageDto(
    string Type,
    string Version,
    Guid CorrelationId,
    string Environment,
    string Locale,
    string Direction,
    string AccessToken,
    ShellUserDto User,
    ShellConfigurationDto Configuration);

public sealed record ShellUserDto(
    string SubjectId,
    string DisplayName,
    string Email,
    IReadOnlyCollection<string> Roles);

public sealed record ShellConfigurationDto(
    string ApiBaseUrl,
    FeatureFlagsDto FeatureFlags);

public sealed record FeatureFlagsDto(
    bool MiniAppsExternalOrigins,
    bool BiChatScaffold);
