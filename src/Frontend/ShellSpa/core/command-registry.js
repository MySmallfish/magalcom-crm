import { ShellEventNames } from "./contracts.js";

export class CommandRegistry {
  #handlers = new Map();
  #middlewares = [];
  #eventBus;

  constructor({ eventBus } = {}) {
    this.#eventBus = eventBus || null;
  }

  register(name, handler, options = {}) {
    if (this.#handlers.has(name) && !options.overwrite) {
      throw new Error(`Command already registered: ${name}`);
    }

    this.#handlers.set(name, handler);
  }

  use(middleware) {
    this.#middlewares.push(middleware);
  }

  async execute(commandOrName, payload) {
    const command = typeof commandOrName === "string"
      ? { name: commandOrName, payload: payload ?? null, metadata: {} }
      : commandOrName;

    const handler = this.#handlers.get(command.name);
    if (!handler) {
      throw new Error(`Command not registered: ${command.name}`);
    }

    const pipeline = [...this.#middlewares];
    let pointer = -1;

    const invoke = async (index, nextCommand) => {
      if (index <= pointer) {
        throw new Error("Command middleware called next more than once.");
      }

      pointer = index;

      if (index === pipeline.length) {
        return handler(nextCommand.payload, nextCommand);
      }

      const middleware = pipeline[index];
      return middleware(nextCommand, (mutatedCommand = nextCommand) => invoke(index + 1, mutatedCommand));
    };

    this.#eventBus?.publish(ShellEventNames.CommandExecuting, command);

    try {
      const result = await invoke(0, command);
      this.#eventBus?.publish(ShellEventNames.CommandExecuted, { command, result });
      return result;
    } catch (error) {
      this.#eventBus?.publish(ShellEventNames.CommandFailed, { command, error: String(error) });
      throw error;
    }
  }
}
