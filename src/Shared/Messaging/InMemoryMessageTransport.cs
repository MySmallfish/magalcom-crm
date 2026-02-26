using System.Collections.Concurrent;

namespace Magalcom.Crm.Shared.Messaging;

public sealed class InMemoryMessageTransport : ICommandPublisher, IEventPublisher, IBackgroundJobQueue
{
    private readonly ConcurrentQueue<object> _queue = new();

    public Task PublishCommandAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default)
    {
        _queue.Enqueue(envelope);
        return Task.CompletedTask;
    }

    public Task PublishEventAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default)
    {
        _queue.Enqueue(envelope);
        return Task.CompletedTask;
    }

    public Task EnqueueAsync<T>(MessageEnvelope<T> envelope, CancellationToken cancellationToken = default)
    {
        _queue.Enqueue(envelope);
        return Task.CompletedTask;
    }
}
