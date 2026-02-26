import { loadTemplate } from "../core/template-loader.js";

export class McCommandBar extends HTMLElement {
  #commands = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set commands(value) {
    this.#commands = value || [];
    this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/command-bar.html");
    this.shadowRoot.innerHTML = template;

    const container = this.shadowRoot.querySelector("[data-command-list]");
    container.innerHTML = "";

    for (const command of this.#commands) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = command.label;
      button.className = "command-btn";
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("command", {
            detail: { name: command.name, payload: command.payload || null },
            bubbles: true,
            composed: true
          })
        );
      });

      container.appendChild(button);
    }
  }
}

customElements.define("mc-command-bar", McCommandBar);
