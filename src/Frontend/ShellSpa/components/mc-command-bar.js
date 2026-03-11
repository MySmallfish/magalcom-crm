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
      button.className = "command-btn";
      button.disabled = Boolean(command.disabled);

      const label = document.createElement("span");
      label.textContent = command.label;

      if (command.icon) {
        const icon = document.createElement("span");
        icon.textContent = command.icon;
        button.appendChild(icon);
      }

      button.appendChild(label);

      if (command.description) {
        button.title = command.description;
      }

      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("command", {
            detail: {
              name: command.name,
              payload: command.payload || null,
              metadata: command.metadata || {}
            },
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
