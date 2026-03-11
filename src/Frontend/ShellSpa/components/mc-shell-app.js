import { ApiClient } from "../core/api-client.js";
import { AuthService } from "../core/auth-service.js";
import { CommandRegistry } from "../core/command-registry.js";
import {
  ShellCommandNames,
  ShellEventNames
} from "../core/contracts.js";
import { EventBus } from "../core/event-bus.js";
import {
  DefaultLocale,
  getDirection,
  localizeMiniAppTitle,
  normalizeLocale,
  t
} from "../core/i18n.js";
import { createMiniAppBridge } from "../core/miniapp-bridge.js";
import { PluginRegistry } from "../core/plugin-registry.js";
import { RealtimeClient } from "../core/realtime-client.js";
import { createHashRouter } from "../core/router.js";
import { createShellActor } from "../core/state-machine.js";
import { loadTemplate } from "../core/template-loader.js";

const LOCALE_STORAGE_KEY = "magalcom.crm.locale";

function hasRoute(items, route) {
  return (items || []).some((item) => item.route === route || hasRoute(item.children || [], route));
}

export class McShellApp extends HTMLElement {
  #config;
  #authService;
  #apiClient;
  #eventBus;
  #commandRegistry;
  #realtimeClient;
  #pluginRegistry;
  #router;
  #state;
  #stateSubscription;
  #miniAppBridge;
  #activeMiniAppSession = null;
  #locale = DefaultLocale;
  #direction = getDirection(DefaultLocale);
  #routeRenderSignature = "";
  #routeRenderToken = 0;
  #unsubscribers = [];

  #ui = {
    sideMenu: null,
    pageHost: null,
    profileTrigger: null,
    profileName: null,
    profileEmail: null,
    logoutButton: null,
    toastHost: null
  };

  #translate(key, params = {}) {
    return t(this.#locale, key, params);
  }

  #translateMenuItem(item) {
    const translated = this.#translate(`menu.${item.id}`);
    if (translated !== `menu.${item.id}`) {
      return translated;
    }

    return localizeMiniAppTitle(this.#locale, item.id, item.title || item.id);
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this.#config = await this.#loadConfiguration();
    this.#locale = this.#readSavedLocale();
    this.#direction = getDirection(this.#locale);
    this.#eventBus = new EventBus();
    this.#commandRegistry = new CommandRegistry({ eventBus: this.#eventBus });
    this.#pluginRegistry = new PluginRegistry();
    this.#state = createShellActor();

    this.#authService = new AuthService(this.#config);
    this.#apiClient = new ApiClient(this.#config.apiBaseUrl, this.#authService);
    this.#realtimeClient = new RealtimeClient(this.#config.apiBaseUrl, this.#authService, this.#eventBus);

    await this.#renderShellChrome();
    this.#applyLocalizedChrome();
    this.#registerPlugins();
    this.#registerCommandMiddleware();
    this.#registerCommands();
    this.#setupMiniAppBridge();

    this.#stateSubscription = this.#state.subscribe((snapshot) => {
      void this.#applyShellState(snapshot);
    });

    this.#state.start();
    this.#setupRouter();
    this.#state.send({ type: "AUTH_REQUIRED" });
    this.#renderStatusPage({
      title: this.#translate("auth.signingInTitle"),
      subtitle: this.#translate("auth.signingInDescription")
    });
    await this.#bootstrapAuthenticationAndSession();
  }

  disconnectedCallback() {
    this.#stateSubscription?.unsubscribe();

    for (const unsubscribe of this.#unsubscribers) {
      unsubscribe();
    }

    this.#router?.dispose?.();
    this.#miniAppBridge?.dispose?.();
    this.#state?.stop();
  }

  #readSavedLocale(subjectId) {
    try {
      const userValue = subjectId
        ? window.localStorage.getItem(`${LOCALE_STORAGE_KEY}:${subjectId}`)
        : null;
      const defaultValue = window.localStorage.getItem(`${LOCALE_STORAGE_KEY}:default`);
      return normalizeLocale(userValue || defaultValue || DefaultLocale);
    } catch {
      return DefaultLocale;
    }
  }

  #persistLocale(locale, subjectId) {
    try {
      window.localStorage.setItem(`${LOCALE_STORAGE_KEY}:default`, locale);
      if (subjectId) {
        window.localStorage.setItem(`${LOCALE_STORAGE_KEY}:${subjectId}`, locale);
      }
    } catch {
      // Ignore locale persistence failures in local development.
    }
  }

  #localizeSitemap(items) {
    return (items || []).map((item) => ({
      ...item,
      title: this.#translateMenuItem(item),
      children: this.#localizeSitemap(item.children || [])
    }));
  }

  async #setLocale(locale, { persist = true, rerender = true } = {}) {
    const normalized = normalizeLocale(locale);
    if (normalized === this.#locale && !rerender) {
      return;
    }

    this.#locale = normalized;
    this.#direction = getDirection(normalized);

    const subjectId = this.#state?.getSnapshot().context.user?.subjectId;
    if (persist) {
      this.#persistLocale(normalized, subjectId);
    }

    this.#applyLocalizedChrome();

    if (rerender && this.#state) {
      this.#routeRenderSignature = "";
      await this.#renderCurrentRoute(this.#state.getSnapshot().context);
    }
  }

  #applyLocalizedChrome() {
    this.setAttribute("lang", this.#locale);
    this.setAttribute("dir", this.#direction);
    document.documentElement.lang = this.#locale;
    document.documentElement.dir = this.#direction;
    document.title = this.#translate("chrome.brand");

    if (!this.shadowRoot) {
      return;
    }

    this.#ui.pageHost?.setAttribute("dir", this.#direction);

    if (this.#ui.sideMenu) {
      this.#ui.sideMenu.setAttribute("dir", this.#direction);
      this.#ui.sideMenu.items = this.#localizeSitemap(this.#state?.getSnapshot().context.sitemap || []);
    }

    const brandLogo = this.shadowRoot.querySelector("[data-brand-logo]");
    if (brandLogo) {
      brandLogo.setAttribute("alt", this.#translate("chrome.brand"));
      brandLogo.setAttribute("title", this.#translate("chrome.brand"));
    }

    if (this.#ui.profileTrigger) {
      this.#ui.profileTrigger.setAttribute("title", this.#translate("profile.open"));
      this.#ui.profileTrigger.setAttribute("aria-label", this.#translate("profile.open"));
    }

    if (this.#ui.logoutButton) {
      this.#ui.logoutButton.setAttribute("title", this.#translate("profile.logout"));
      this.#ui.logoutButton.setAttribute("aria-label", this.#translate("profile.logout"));
    }

    this.#applySidebarUser(this.#state?.getSnapshot().context.user || null);
  }

  #applySidebarUser(user) {
    if (!this.#ui.profileName || !this.#ui.profileEmail) {
      return;
    }

    this.#ui.profileName.textContent = user?.displayName || this.#translate("profile.guest");
    this.#ui.profileEmail.textContent = user?.email || "";
  }

  #createPageScaffold({ breadcrumb, title, subtitle }) {
    const pageShell = document.createElement("section");
    pageShell.className = "page-shell";

    const header = document.createElement("header");
    header.className = "page-header";

    const breadcrumbElement = document.createElement("p");
    breadcrumbElement.className = "page-breadcrumb";
    breadcrumbElement.textContent = breadcrumb;

    const titleElement = document.createElement("h1");
    titleElement.className = "page-title";
    titleElement.textContent = title;

    const subtitleElement = document.createElement("p");
    subtitleElement.className = "page-subtitle";
    subtitleElement.textContent = subtitle;

    header.appendChild(breadcrumbElement);
    header.appendChild(titleElement);
    header.appendChild(subtitleElement);

    const body = document.createElement("div");
    body.className = "page-body";

    pageShell.appendChild(header);
    pageShell.appendChild(body);

    return { pageShell, body };
  }

  async #loadConfiguration() {
    const response = await fetch("/shell/config", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Shell configuration request failed with status ${response.status}.`);
    }

    return response.json();
  }

  async #renderShellChrome() {
    const template = await loadTemplate("/templates/shell-app.html");
    this.shadowRoot.innerHTML = template;

    this.#ui.sideMenu = this.shadowRoot.querySelector("mc-side-menu");
    this.#ui.pageHost = this.shadowRoot.querySelector("[data-page-host]");
    this.#ui.profileTrigger = this.shadowRoot.querySelector("[data-profile-trigger]");
    this.#ui.profileName = this.shadowRoot.querySelector("[data-profile-name]");
    this.#ui.profileEmail = this.shadowRoot.querySelector("[data-profile-email]");
    this.#ui.logoutButton = this.shadowRoot.querySelector("[data-logout-button]");
    this.#ui.toastHost = this.shadowRoot.querySelector("[data-toast-host]");

    this.#ui.sideMenu.addEventListener("menu-select", async (event) => {
      await this.#commandRegistry.execute({
        name: ShellCommandNames.Navigate,
        payload: event.detail,
        metadata: { source: "side-menu" }
      });
    });

    this.#ui.profileTrigger.addEventListener("click", async () => {
      await this.#commandRegistry.execute({
        name: ShellCommandNames.OpenProfile,
        payload: {},
        metadata: { source: "sidebar-profile" }
      });
    });

    this.#ui.logoutButton.addEventListener("click", async () => {
      await this.#commandRegistry.execute({
        name: ShellCommandNames.Logout,
        payload: {},
        metadata: { source: "sidebar-logout" }
      });
    });
  }

  #setupRouter() {
    this.#router = createHashRouter((route, routeData) => {
      this.#state.send({
        type: "NAVIGATE",
        route,
        query: routeData.query
      });

      this.#eventBus.publish(ShellEventNames.RouteChanged, {
        route,
        query: routeData.query
      });
    });
  }

  #setupMiniAppBridge() {
    const allowedOrigins = this.#config.miniApps?.allowedOrigins || [];
    this.#miniAppBridge = createMiniAppBridge(this.#eventBus, this.#commandRegistry, allowedOrigins);

    const unsubscribe = this.#eventBus.subscribe("*", ({ eventName, payload }) => {
      if (!this.#activeMiniAppSession) {
        return;
      }

      if (eventName === ShellEventNames.MiniAppCommandExecuted || eventName === ShellEventNames.MiniAppCommandFailed) {
        return;
      }

      try {
        this.#miniAppBridge.sendEvent(
          this.#activeMiniAppSession.frame.iframeElement,
          this.#activeMiniAppSession.miniApp.origin,
          eventName,
          payload
        );
      } catch {
        // Ignore message propagation failures for mini-app frame lifecycle events.
      }
    });

    this.#unsubscribers.push(unsubscribe);
  }

  #registerCommandMiddleware() {
    this.#commandRegistry.use(async (command, next) => {
      const enriched = {
        ...command,
        metadata: {
          ...(command.metadata || {}),
          commandId: crypto.randomUUID(),
          issuedAtUtc: new Date().toISOString()
        }
      };

      return next(enriched);
    });
  }

  #registerCommands() {
    this.#commandRegistry.register(ShellCommandNames.Navigate, ({ route }) => {
      this.#router.navigate(route);
    });

    this.#commandRegistry.register(ShellCommandNames.OpenProfile, () => {
      this.#router.navigate("/profile");
    });

    this.#commandRegistry.register(ShellCommandNames.OpenMiniApp, ({ miniAppId }) => {
      const miniApp = this.#pluginRegistry.getMiniApp(miniAppId);
      this.#router.navigate(miniApp?.route || `/mini-apps/${miniAppId}`);
    });

    this.#commandRegistry.register(ShellCommandNames.Logout, async () => {
      this.#state.send({ type: "LOGOUT" });
      this.#renderStatusPage({
        title: this.#translate("auth.redirectingTitle"),
        subtitle: this.#translate("auth.redirectingDescription")
      });
      await this.#authService.signOut();
    });

    this.#commandRegistry.register(ShellCommandNames.Notify, ({ message }) => {
      this.#notify(message || this.#translate("shell.notificationDefault"));
    });
  }

  #registerPlugins() {
    this.#pluginRegistry.register({
      id: "home",
      pattern: "/",
      order: 10,
      render: async ({ host, context }) => {
        const { pageShell, body } = this.#createPageScaffold({
          breadcrumb: this.#translate("menu.home"),
          title: this.#translate("home.title"),
          subtitle: this.#translate("home.description")
        });

        const card = document.createElement("section");
        card.className = "content-card";
        card.innerHTML = `
          <p>${this.#translate("home.loggedInAs")}: <strong>${context.user?.displayName || this.#translate("profile.guest")}</strong></p>
        `;

        body.appendChild(card);
        host.appendChild(pageShell);
      }
    });

    this.#pluginRegistry.register({
      id: "profile",
      pattern: "/profile",
      order: 20,
      render: async ({ host, context }) => {
        const { pageShell, body } = this.#createPageScaffold({
          breadcrumb: this.#translate("menu.profile"),
          title: this.#translate("profile.title"),
          subtitle: this.#translate("profile.description")
        });

        const profile = document.createElement("mc-profile-page");
        profile.user = context.user;
        profile.locale = this.#locale;
        profile.labels = {
          displayName: this.#translate("profile.displayName"),
          email: this.#translate("profile.email"),
          subjectId: this.#translate("profile.subjectId"),
          roles: this.#translate("profile.roles"),
          language: this.#translate("profile.language"),
          languageHelp: this.#translate("profile.languageHelp"),
          logout: this.#translate("profile.logoutButton"),
          hebrew: this.#translate("locale.he"),
          english: this.#translate("locale.en"),
          notAvailable: this.#translate("common.notAvailable"),
          none: this.#translate("common.none")
        };
        profile.setAttribute("dir", this.#direction);
        profile.addEventListener("locale-change", async (event) => {
          await this.#setLocale(event.detail.locale);
        });
        profile.addEventListener("logout", async () => {
          await this.#commandRegistry.execute({
            name: ShellCommandNames.Logout,
            payload: {},
            metadata: { source: "profile-page" }
          });
        });

        body.appendChild(profile);
        host.appendChild(pageShell);
      }
    });

    this.#pluginRegistry.register({
      id: "miniapps-catalog",
      pattern: "/mini-apps",
      order: 30,
      render: async ({ host }) => {
        this.#renderMiniAppsCatalog(host);
      }
    });

    this.#pluginRegistry.register({
      id: "miniapp-route",
      pattern: "/mini-apps/:id",
      order: 40,
      render: async ({ host, params, context }) => {
        await this.#renderMiniApp(host, params.id, context);
      }
    });
  }

  async #bootstrapAuthenticationAndSession() {
    try {
      this.#renderStatusPage({
        title: this.#translate("auth.signingInTitle"),
        subtitle: this.#translate("auth.signingInDescription")
      });

      await this.#authService.initialize();
      if (!this.#authService.getUserContext()) {
        this.#renderStatusPage({
          title: this.#translate("auth.redirectingTitle"),
          subtitle: this.#translate("auth.redirectingDescription")
        });
        await this.#authService.signIn();
        return;
      }

      const authUser = this.#authService.getUserContext();
      if (!authUser) {
        throw new Error("Authentication succeeded but no user context was returned.");
      }

      this.#state.send({ type: "AUTH_SUCCESS", user: authUser });
      this.#renderStatusPage({
        title: this.#translate("auth.loadingSessionTitle"),
        subtitle: this.#translate("auth.loadingSessionDescription")
      });
      await this.#initializeAuthenticatedSession();
    } catch (error) {
      const message = String(error);
      this.#state.send({ type: "AUTH_FAILURE", error: message });
      this.#state.send({ type: "SESSION_FAILED", error: message });
      this.#renderStatusPage({
        title: this.#translate("auth.failedTitle"),
        subtitle: this.#translate("auth.failedDescription", { message })
      });
      this.#notify(this.#translate("shell.sessionFailed", { message }), "error");
    }
  }

  async #initializeAuthenticatedSession() {
    const [me, sitemap, miniApps] = await Promise.all([
      this.#apiClient.getMe(),
      this.#apiClient.getSitemap(),
      this.#apiClient.getMiniApps()
    ]);

    await this.#setLocale(this.#readSavedLocale(me.subjectId), { persist: false, rerender: false });

    this.#pluginRegistry.setMiniApps(miniApps);

    this.#state.send({
      type: "SESSION_READY",
      user: me,
      sitemap,
      miniApps
    });

    this.#eventBus.publish(ShellEventNames.ShellReady, {
      user: me,
      sitemap,
      miniApps
    });

    try {
      await this.#realtimeClient.connect();
      await this.#realtimeClient.ping("Shell connected");
    } catch {
      // Realtime channel is optional for bootstrapping in local development.
    }
  }

  async #applyShellState(snapshot) {
    if (!this.#ui.sideMenu) {
      return;
    }

    const context = snapshot.context;
    const stateValue = snapshot.value;
    const localizedSitemap = this.#localizeSitemap(context.sitemap || []);
    this.#ui.sideMenu.items = stateValue === "ready" ? localizedSitemap : [];
    this.#ui.sideMenu.activeRoute = stateValue === "ready"
      ? (hasRoute(localizedSitemap, context.route)
          ? context.route
          : (context.route.startsWith("/mini-apps/") ? "/mini-apps" : context.route))
      : "";
    this.#applySidebarUser(context.user || null);

    this.#renderNotifications(context.notifications || []);

    if (stateValue !== "ready") {
      return;
    }

    const signature = JSON.stringify([
      context.route,
      context.user?.subjectId || "anonymous",
      context.miniApps.length,
      context.activeMiniAppId || "",
      this.#locale
    ]);

    if (signature === this.#routeRenderSignature) {
      return;
    }

    this.#routeRenderSignature = signature;
    await this.#renderCurrentRoute(context);
  }

  #renderStatusPage({ title, subtitle }) {
    if (!this.#ui.pageHost) {
      return;
    }

    const { pageShell, body } = this.#createPageScaffold({
      breadcrumb: this.#translate("chrome.brand"),
      title,
      subtitle
    });
    const card = document.createElement("section");
    card.className = "content-card";
    body.appendChild(card);
    this.#ui.pageHost.replaceChildren(pageShell);
  }

  async #renderCurrentRoute(context) {
    const resolved = this.#pluginRegistry.resolve(context.route)
      || this.#pluginRegistry.resolve("/");
    const renderToken = ++this.#routeRenderToken;
    const stagingHost = document.createElement("div");
    stagingHost.setAttribute("dir", this.#direction);

    if (!context.route.startsWith("/mini-apps/")) {
      this.#activeMiniAppSession = null;
      if (context.activeMiniAppId) {
        this.#state.send({ type: "ACTIVE_MINI_APP_CHANGED", miniAppId: null });
      }
    }

    if (!resolved) {
      if (renderToken !== this.#routeRenderToken) {
        return;
      }

      const { pageShell, body } = this.#createPageScaffold({
        breadcrumb: context.route || "/",
        title: this.#translate("shell.pageNotFound"),
        subtitle: context.route || "/"
      });
      body.innerHTML = `<section class="content-card"><p>${context.route || "/"}</p></section>`;
      this.#ui.pageHost.replaceChildren(pageShell);
      return;
    }

    try {
      await resolved.plugin.render({
        host: stagingHost,
        context,
        params: resolved.params,
        apiClient: this.#apiClient,
        commandRegistry: this.#commandRegistry,
        pluginRegistry: this.#pluginRegistry,
        shell: this
      });

      if (renderToken !== this.#routeRenderToken) {
        return;
      }

      this.#ui.pageHost.replaceChildren(...Array.from(stagingHost.childNodes));
      this.#ui.pageHost.setAttribute("dir", this.#direction);
    } catch (error) {
      if (renderToken !== this.#routeRenderToken) {
        return;
      }

      const { pageShell, body } = this.#createPageScaffold({
        breadcrumb: context.route || "/",
        title: this.#translate("shell.pageFailed"),
        subtitle: context.route || "/"
      });
      const card = document.createElement("section");
      card.className = "content-card";
      const pre = document.createElement("pre");
      pre.textContent = String(error);
      card.appendChild(pre);
      body.appendChild(card);
      this.#ui.pageHost.replaceChildren(pageShell);
      this.#notify(this.#translate("shell.routeRenderFailed", { message: String(error) }), "error");
    }
  }

  #renderMiniAppsCatalog(host) {
    const miniApps = this.#pluginRegistry.listMiniApps();
    const { pageShell, body } = this.#createPageScaffold({
      breadcrumb: this.#translate("menu.mini-apps"),
      title: this.#translate("miniapps.title"),
      subtitle: this.#translate("miniapps.description")
    });

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "0.6rem";

    for (const miniApp of miniApps) {
      const localizedTitle = localizeMiniAppTitle(this.#locale, miniApp.id, miniApp.title);
      const card = document.createElement("div");
      card.style.border = "1px solid #d8e0ea";
      card.style.borderRadius = "1rem";
      card.style.background = "#ffffff";
      card.style.padding = "1rem";
      card.style.boxShadow = "0 18px 36px rgba(17, 33, 51, 0.05)";

      const title = document.createElement("h3");
      title.textContent = localizedTitle;
      title.style.margin = "0 0 0.35rem 0";

      const description = document.createElement("p");
      description.textContent = `${this.#translate("miniapps.route")}: ${miniApp.route}`;
      description.style.margin = "0 0 0.55rem 0";
      description.style.color = "#54708a";
      description.style.fontSize = "0.85rem";

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = this.#translate("miniapps.open");
      button.style.border = "1px solid #067d68";
      button.style.borderRadius = "0.5rem";
      button.style.background = "#0a9078";
      button.style.color = "#fff";
      button.style.padding = "0.4rem 0.7rem";
      button.style.cursor = "pointer";
      button.addEventListener("click", async () => {
        await this.#commandRegistry.execute({
          name: ShellCommandNames.OpenMiniApp,
          payload: { miniAppId: miniApp.id },
          metadata: { source: "miniapp-catalog" }
        });
      });

      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(button);
      list.appendChild(card);
    }

    if (miniApps.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = this.#translate("miniapps.empty");
      list.appendChild(empty);
    }

    body.appendChild(list);
    host.appendChild(pageShell);
  }

  async #renderMiniApp(host, miniAppId, context) {
    const miniApp = this.#pluginRegistry.getMiniApp(miniAppId) || this.#pluginRegistry.getMiniAppByRoute(context.route);

    if (!miniApp) {
      const { pageShell, body } = this.#createPageScaffold({
        breadcrumb: `${this.#translate("menu.mini-apps")} / ${miniAppId}`,
        title: this.#translate("miniapp.notFoundTitle"),
        subtitle: this.#translate("miniapp.notFoundDescription", { miniAppId })
      });
      const card = document.createElement("section");
      card.className = "content-card";
      body.appendChild(card);
      host.appendChild(pageShell);
      return;
    }

    const localizedMiniApp = {
      ...miniApp,
      title: localizeMiniAppTitle(this.#locale, miniApp.id, miniApp.title)
    };
    const { pageShell, body } = this.#createPageScaffold({
      breadcrumb: `${this.#translate("menu.mini-apps")} / ${localizedMiniApp.title}`,
      title: localizedMiniApp.title,
      subtitle: `${this.#translate("miniapps.route")}: ${localizedMiniApp.route}`
    });

    const frame = document.createElement("mc-miniapp-frame");
    frame.miniApp = localizedMiniApp;

    frame.addEventListener("miniapp-loaded", () => {
      const shellUser = context.user || {
        subjectId: "unknown",
        displayName: this.#translate("common.notAvailable"),
        email: this.#translate("common.notAvailable"),
        roles: []
      };

      const contextPayload = {
        correlationId: crypto.randomUUID(),
        environment: this.#config.environment || "Development",
        locale: this.#locale,
        direction: this.#direction,
        user: {
          subjectId: shellUser.subjectId,
          displayName: shellUser.displayName,
          email: shellUser.email,
          roles: shellUser.roles || []
        },
        configuration: {
          apiBaseUrl: this.#config.apiBaseUrl,
          featureFlags: this.#config.features
        }
      };

      this.#miniAppBridge.sendContext(frame.iframeElement, localizedMiniApp.origin, contextPayload);
      this.#activeMiniAppSession = { frame, miniApp: localizedMiniApp };
      this.#state.send({ type: "ACTIVE_MINI_APP_CHANGED", miniAppId: localizedMiniApp.id });
    });

    body.appendChild(frame);
    host.appendChild(pageShell);
  }

  #renderNotifications(notifications) {
    this.#ui.toastHost.innerHTML = "";

    for (const notification of notifications.slice(-3)) {
      const toast = document.createElement("article");
      toast.className = "toast";

      const message = document.createElement("span");
      message.textContent = notification.message;

      if (notification.level === "error") {
        message.style.color = "#9d3a3a";
        message.style.fontWeight = "600";
      }

      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "x";
      close.addEventListener("click", () => {
        this.#state.send({ type: "NOTIFICATION_DISMISSED", id: notification.id });
      });

      toast.appendChild(message);
      toast.appendChild(close);
      this.#ui.toastHost.appendChild(toast);
    }
  }

  #notify(message, level = "info") {
    const id = crypto.randomUUID();

    this.#state.send({
      type: "NOTIFICATION_ADDED",
      id,
      message,
      level
    });

    window.setTimeout(() => {
      this.#state.send({ type: "NOTIFICATION_DISMISSED", id });
    }, 6000);
  }
}

customElements.define("mc-shell-app", McShellApp);
