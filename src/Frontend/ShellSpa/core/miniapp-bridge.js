export function createMiniAppBridge(eventBus, commandRegistry, allowedOrigins) {
  const originSet = new Set(allowedOrigins || []);

  const onMessage = async (event) => {
    if (!originSet.has(event.origin)) {
      return;
    }

    const message = event.data;
    if (!message || message.type !== "magalcom.miniapp.command" || message.version !== "v1") {
      return;
    }

    try {
      await commandRegistry.execute(message.command, message.payload);
      eventBus.publish("miniapp.command.executed", message);
    } catch (error) {
      eventBus.publish("miniapp.command.failed", {
        message,
        error: String(error)
      });
    }
  };

  window.addEventListener("message", onMessage);

  return {
    dispose() {
      window.removeEventListener("message", onMessage);
    },
    sendContext(iframe, targetOrigin, contextPayload) {
      if (!originSet.has(targetOrigin)) {
        throw new Error(`Origin is not allowlisted: ${targetOrigin}`);
      }

      iframe.contentWindow?.postMessage(
        {
          type: "magalcom.shell.context",
          version: "v1",
          ...contextPayload
        },
        targetOrigin
      );
    },
    sendEvent(iframe, targetOrigin, eventType, payload) {
      if (!originSet.has(targetOrigin)) {
        throw new Error(`Origin is not allowlisted: ${targetOrigin}`);
      }

      iframe.contentWindow?.postMessage(
        {
          type: "magalcom.shell.event",
          version: "v1",
          eventType,
          payload
        },
        targetOrigin
      );
    }
  };
}
