import { loadTemplate } from "../core/template-loader.js";

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

    const title = this.shadowRoot.querySelector("[data-miniapp-title]");
    const frame = this.shadowRoot.querySelector("iframe");

    if (!this.#miniApp) {
      title.textContent = "No mini app selected";
      frame.src = "about:blank";
      return;
    }

    title.textContent = this.#miniApp.title;
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
