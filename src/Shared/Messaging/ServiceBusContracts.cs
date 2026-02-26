namespace Magalcom.Crm.Shared.Messaging;

public static class ServiceBusContracts
{
    public const string CommandTopic = "crm.commands";
    public const string EventTopic = "crm.events";
    public const string JobsQueue = "crm.jobs";
}

public sealed record MessageMetadata(
    Guid MessageId,
    Guid CorrelationId,
    Guid? CausationId,
    string TenantId,
    string UserId,
    DateTime OccurredAtUtc);

public sealed record MessageEnvelope<T>(
    MessageMetadata Metadata,
    string Type,
    T Payload);

public interface ICommandPublisher
{
    Task PublishCommandAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default);
}

public interface IEventPublisher
{
    Task PublishEventAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default);
}

public interface IBackgroundJobQueue
{
    Task EnqueueAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default);
}
