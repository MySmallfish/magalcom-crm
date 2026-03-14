import { loadTemplate } from "../core/template-loader.js";

const DEFAULT_SANDBOX_TOKENS = ["allow-scripts", "allow-forms", "allow-downloads"];

function resolveMiniAppOrigin(miniApp) {
  if (!miniApp) {
    return null;
  }

  if (miniApp.origin) {
    return miniApp.origin;
  }

  try {
    return new URL(miniApp.url, window.location.href).origin;
  } catch {
    return null;
  }
}

function getSandboxPolicy(miniApp) {
  const sandboxTokens = [...DEFAULT_SANDBOX_TOKENS];
  const miniAppOrigin = resolveMiniAppOrigin(miniApp);

  // Same-origin mini-apps need a real origin so ES modules and API calls do not downgrade to `null`.
  if (miniAppOrigin === window.location.origin) {
    sandboxTokens.push("allow-same-origin");
  }

  return sandboxTokens.join(" ");
}

export class McMiniAppFrame extends HTMLElement {
  #miniApp = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set miniApp(value) {
    this.#miniApp = value;
    this.render();
  }

  get iframeElement() {
    return this.shadowRoot?.querySelector("iframe");
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/miniapp-frame.html");
    this.shadowRoot.innerHTML = template;
    this.toggleAttribute("fullscreen", this.#miniApp?.useFullScreenLayout === true);

    const frame = this.shadowRoot.querySelector("iframe");

    if (!this.#miniApp) {
      frame.title = "No mini app selected";
      frame.src = "about:blank";
      return;
    }

    frame.title = this.#miniApp.title;
    frame.setAttribute("sandbox", getSandboxPolicy(this.#miniApp));
    frame.src = this.#miniApp.url;

    frame.addEventListener("load", () => {
      this.dispatchEvent(
        new CustomEvent("miniapp-loaded", {
          detail: this.#miniApp,
          bubbles: true,
          composed: true
        })
      );
    });
  }
}

customElements.define("mc-miniapp-frame", McMiniAppFrame);
