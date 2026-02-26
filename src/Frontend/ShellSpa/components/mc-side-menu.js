import { loadTemplate } from "../core/template-loader.js";

export class McSideMenu extends HTMLElement {
  #items = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set items(value) {
    this.#items = value || [];
    this.render();
  }

  get items() {
    return this.#items;
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/side-menu.html");
    this.shadowRoot.innerHTML = template;

    const list = this.shadowRoot.querySelector("[data-menu-items]");
    list.innerHTML = "";

    for (const item of [...this.#items].sort((a, b) => a.order - b.order)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-item";
      button.textContent = item.title;
      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("menu-select", {
            detail: { route: item.route },
            bubbles: true,
            composed: true
          })
        );
      });

      list.appendChild(button);
    }
  }
}

customElements.define("mc-side-menu", McSideMenu);
