import { loadTemplate } from "../core/template-loader.js";

export class McGrid extends HTMLElement {
  #rows = [];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set rows(value) {
    this.#rows = value || [];
    this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/grid.html");
    this.shadowRoot.innerHTML = template;

    const container = this.shadowRoot.querySelector("[data-grid-body]");
    container.innerHTML = "";

    for (const row of this.#rows) {
      const line = document.createElement("div");
      line.className = "grid-row";
      line.textContent = JSON.stringify(row);
      container.appendChild(line);
    }
  }
}

customElements.define("mc-grid", McGrid);
