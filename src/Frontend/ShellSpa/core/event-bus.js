export class EventBus {
  #listeners = new Map();

  subscribe(eventName, callback, options = {}) {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    const set = this.#listeners.get(eventName);
    const wrappedCallback = options.once
      ? (payload) => {
          set.delete(wrappedCallback);
          callback(payload);
        }
      : callback;

    set.add(wrappedCallback);

    return () => set.delete(wrappedCallback);
  }

  publish(eventName, payload) {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) {
      const wildcardListeners = this.#listeners.get("*");
      if (!wildcardListeners) {
        return;
      }

      for (const callback of wildcardListeners) {
        callback({ eventName, payload });
      }

      return;
    }

    for (const callback of listeners) {
      callback(payload);
    }

    const wildcardListeners = this.#listeners.get("*");
    if (!wildcardListeners) {
      return;
    }

    for (const callback of wildcardListeners) {
      callback({ eventName, payload });
    }
  }
}
