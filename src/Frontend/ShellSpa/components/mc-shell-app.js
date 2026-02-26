import { ApiClient } from "../core/api-client.js";
import { AuthService } from "../core/auth-service.js";
import { CommandRegistry } from "../core/command-registry.js";
import { EventBus } from "../core/event-bus.js";
import { createMiniAppBridge } from "../core/miniapp-bridge.js";
import { RealtimeClient } from "../core/realtime-client.js";
import { createHashRouter } from "../core/router.js";
import { createShellActor } from "../core/state-machine.js";
import { loadTemplate } from "../core/template-loader.js";

export class McShellApp extends HTMLElement {
  #config;
  #authService;
  #apiClient;
  #eventBus;
  #commandRegistry;
  #realtimeClient;
  #router;
  #state;
  #miniAppBridge;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.#config = await this.#loadConfiguration();
    this.#eventBus = new EventBus();
    this.#commandRegistry = new CommandRegistry();
    this.#state = createShellActor();

    this.#state.subscribe((snapshot) => {
      this.render(snapshot.context);
    });
    this.#state.start();

    await this.render(this.#state.getSnapshot().context);

    this.#authService = new AuthService(this.#config);
    this.#apiClient = new ApiClient(this.#config.apiBaseUrl, this.#authService);
    this.#realtimeClient = new RealtimeClient(this.#config.apiBaseUrl, this.#authService, this.#eventBus);

    this.#registerCommands();
    this.#setupRouter();
    this.#setupMiniAppBridge();

    if (this.#config.authentication?.disableAuthentication) {
      this.#state.send({ type: "AUTH_DISABLED" });
      await this.#initializeAuthenticatedSession();
      return;
    }

    this.#state.send({ type: "AUTH_REQUIRED" });

    try {
      await this.#authService.initialize();
      const userContext = this.#authService.getUserContext();

      if (!userContext) {
        await this.#authService.signIn();
      }

      await this.#initializeAuthenticatedSession();
    } catch (error) {
      this.#state.send({ type: "AUTH_FAILURE", error: String(error) });
    }
  }

  async #loadConfiguration() {
    const fileConfig = window.MAGALCOM_CONFIG || {};

    try {
      const response = await fetch("/shell/config", { cache: "no-cache" });
      if (!response.ok) {
        return fileConfig;
      }

      const runtimeConfig = await response.json();
      return {
        ...fileConfig,
        ...runtimeConfig,
        authentication: {
          ...(fileConfig.authentication || {}),
          ...(runtimeConfig.authentication || {})
        },
        features: {
          ...(fileConfig.features || {}),
          ...(runtimeConfig.features || {})
        },
        miniApps: {
          ...(fileConfig.miniApps || {}),
          ...(runtimeConfig.miniApps || {})
        }
      };
    } catch {
      return fileConfig;
    }
  }

  #setupRouter() {
    this.#router = createHashRouter((route) => {
      this.#state.send({ type: "NAVIGATE", route });
      this.#renderPage(route);
    });
  }

  #setupMiniAppBridge() {
    const allowedOrigins = this.#config.miniApps?.allowedOrigins || [];
    this.#miniAppBridge = createMiniAppBridge(this.#eventBus, this.#commandRegistry, allowedOrigins);
  }

  #registerCommands() {
    this.#commandRegistry.register("navigate", ({ route }) => {
      this.#router.navigate(route);
    });

    this.#commandRegistry.register("profile.open", () => {
      this.#router.navigate("/profile");
    });

    this.#commandRegistry.register("auth.logout", async () => {
      await this.#authService.signOut();
      this.#state.send({ type: "LOGOUT" });
      this.#router.navigate("/");
      if (!this.#config.authentication?.disableAuthentication) {
        await this.#authService.signIn();
        await this.#initializeAuthenticatedSession();
      }
    });

    this.#commandRegistry.register("shell.notify", ({ message }) => {
      window.alert(message || "Notification from mini app");
    });
  }

  async #initializeAuthenticatedSession() {
    await this.#authService.initialize();

    const [me, sitemap, miniApps] = await Promise.all([
      this.#apiClient.getMe(),
      this.#apiClient.getSitemap(),
      this.#apiClient.getMiniApps()
    ]);

    this.#state.send({ type: "SET_USER", user: me });
    this.#state.send({ type: "SITEMAP_LOADED", sitemap });
    this.#state.send({ type: "MINI_APPS_LOADED", miniApps });
    this.#state.send({ type: "AUTH_SUCCESS", user: me });

    this.#eventBus.publish("shell.ready", {
      user: me,
      sitemap,
      miniApps
    });

    try {
      await this.#realtimeClient.connect();
      await this.#realtimeClient.ping("Shell connected");
    } catch {
      // Realtime is optional in initial setup; failure should not block shell loading.
    }

    this.#renderPage(this.#state.getSnapshot().context.route);
  }

  async render(context) {
    const template = await loadTemplate("/templates/shell-app.html");
    this.shadowRoot.innerHTML = template;

    const sideMenu = this.shadowRoot.querySelector("mc-side-menu");
    const profilePopover = this.shadowRoot.querySelector("mc-profile-popover");

    sideMenu.items = context.sitemap || [];
    profilePopover.user = context.user;

    sideMenu.addEventListener("menu-select", async (event) => {
      await this.#commandRegistry.execute("navigate", event.detail);
    });

    profilePopover.addEventListener("profile-open", async () => {
      await this.#commandRegistry.execute("profile.open");
    });

    profilePopover.addEventListener("logout", async () => {
      await this.#commandRegistry.execute("auth.logout");
    });

    this.shadowRoot.querySelector("[data-environment]").textContent = this.#config.environment || "Development";
  }

  #renderPage(route) {
    const pageHost = this.shadowRoot.querySelector("[data-page-host]");
    if (!pageHost) {
      return;
    }

    pageHost.innerHTML = "";

    if (route === "/profile") {
      const profile = document.createElement("mc-profile-page");
      profile.user = this.#state.getSnapshot().context.user;
      pageHost.appendChild(profile);
      return;
    }

    if (route === "/leads") {
      const commandBar = document.createElement("mc-command-bar");
      commandBar.commands = [
        { name: "shell.notify", label: "Create Lead", payload: { message: "Lead create command scaffolded." } },
        { name: "shell.notify", label: "Generate Report", payload: { message: "Prediction report command scaffolded." } }
      ];
      commandBar.addEventListener("command", async (event) => {
        await this.#commandRegistry.execute(event.detail.name, event.detail.payload);
      });

      const grid = document.createElement("mc-grid");
      this.#apiClient.getLeads().then((rows) => {
        grid.rows = rows;
      }).catch((error) => {
        grid.rows = [{ error: String(error) }];
      });

      pageHost.appendChild(commandBar);
      pageHost.appendChild(grid);
      return;
    }

    if (route.startsWith("/mini-apps")) {
      const miniApp = this.#state.getSnapshot().context.miniApps[0];
      const frame = document.createElement("mc-miniapp-frame");
      frame.miniApp = miniApp;
      frame.addEventListener("miniapp-loaded", () => {
        if (!miniApp) {
          return;
        }

        const user = this.#state.getSnapshot().context.user;
        const contextPayload = {
          correlationId: crypto.randomUUID(),
          environment: this.#config.environment || "Development",
          user: {
            subjectId: user?.subjectId || "unknown",
            displayName: user?.displayName || "Unknown",
            email: user?.email || "unknown",
            roles: user?.roles || []
          },
          configuration: {
            apiBaseUrl: this.#config.apiBaseUrl,
            featureFlags: this.#config.features
          }
        };

        this.#miniAppBridge.sendContext(frame.iframeElement, miniApp.origin, contextPayload);
      });

      pageHost.appendChild(frame);
      return;
    }

    const home = document.createElement("div");
    home.className = "home-page";
    home.innerHTML = `
      <h2>Welcome to Magalcom CRM</h2>
      <p>Logged in as: <strong>${this.#state.getSnapshot().context.user?.displayName || "Guest"}</strong></p>
      <p>Use the side menu to navigate through the shell and mini-app host.</p>
    `;
    pageHost.appendChild(home);
  }
}

customElements.define("mc-shell-app", McShellApp);
