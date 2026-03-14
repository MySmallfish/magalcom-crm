import {
  createShellContextMessage,
  createShellEventMessage,
  isMiniAppCommandMessage,
  ShellEventNames
} from "./contracts.js";

export function createMiniAppBridge(eventBus, commandRegistry, allowedOrigins) {
  const originSet = new Set(allowedOrigins || []);

  const onMessage = async (event) => {
    if (!originSet.has(event.origin)) {
      return;
    }

    const message = event.data;
    if (!isMiniAppCommandMessage(message)) {
      return;
    }

    try {
      if (!commandRegistry.canExecute({
        name: message.command,
        payload: message.payload,
        metadata: {
          source: "mini-app",
          origin: event.origin
        }
      })) {
        throw new Error(`Command cannot execute: ${message.command}`);
      }

      await commandRegistry.execute({
        name: message.command,
        payload: message.payload,
        metadata: {
          source: "mini-app",
          origin: event.origin
        }
      });

      eventBus.publish(ShellEventNames.MiniAppCommandExecuted, message);
    } catch (error) {
      eventBus.publish(ShellEventNames.MiniAppCommandFailed, {
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

      const message = createShellContextMessage(contextPayload);
      iframe.contentWindow?.postMessage(message, targetOrigin);
    },
    sendEvent(iframe, targetOrigin, eventType, payload) {
      if (!originSet.has(targetOrigin)) {
        throw new Error(`Origin is not allowlisted: ${targetOrigin}`);
      }

      const message = createShellEventMessage(eventType, payload);
      iframe.contentWindow?.postMessage(message, targetOrigin);
    }
  };
}
