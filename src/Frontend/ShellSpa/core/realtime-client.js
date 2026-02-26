export class RealtimeClient {
  #baseUrl;
  #authService;
  #eventBus;
  #connection;

  constructor(baseUrl, authService, eventBus) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
    this.#authService = authService;
    this.#eventBus = eventBus;
  }

  async connect() {
    if (!window.signalR) {
      return;
    }

    this.#connection = new window.signalR.HubConnectionBuilder()
      .withUrl(`${this.#baseUrl}/hubs/updates`, {
        accessTokenFactory: async () => this.#authService.getAccessToken()
      })
      .withAutomaticReconnect()
      .build();

    this.#connection.on("Pong", (payload) => {
      this.#eventBus.publish("realtime.pong", payload);
    });

    await this.#connection.start();
  }

  async ping(message) {
    if (!this.#connection || this.#connection.state !== "Connected") {
      return;
    }

    await this.#connection.invoke("Ping", message);
  }
}
