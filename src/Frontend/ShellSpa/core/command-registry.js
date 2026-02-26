export class CommandRegistry {
  #handlers = new Map();

  register(name, handler) {
    this.#handlers.set(name, handler);
  }

  async execute(name, payload) {
    const handler = this.#handlers.get(name);
    if (!handler) {
      throw new Error(`Command not registered: ${name}`);
    }

    return handler(payload);
  }
}
