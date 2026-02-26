export class EventBus {
  #listeners = new Map();

  subscribe(eventName, callback) {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }

    const set = this.#listeners.get(eventName);
    set.add(callback);

    return () => set.delete(callback);
  }

  publish(eventName, payload) {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) {
      return;
    }

    for (const callback of listeners) {
      callback(payload);
    }
  }
}
