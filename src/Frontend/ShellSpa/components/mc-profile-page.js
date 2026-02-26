import { loadTemplate } from "../core/template-loader.js";

export class McProfilePage extends HTMLElement {
  #user = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set user(value) {
    this.#user = value;
    this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/profile-page.html");
    this.shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector("[data-profile-name]").textContent = this.#user?.displayName || "N/A";
    this.shadowRoot.querySelector("[data-profile-email]").textContent = this.#user?.email || "N/A";
    this.shadowRoot.querySelector("[data-profile-subject]").textContent = this.#user?.subjectId || "N/A";
    this.shadowRoot.querySelector("[data-profile-roles]").textContent = (this.#user?.roles || []).join(", ") || "None";
  }
}

customElements.define("mc-profile-page", McProfilePage);
