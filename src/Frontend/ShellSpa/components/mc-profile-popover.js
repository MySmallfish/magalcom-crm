import { loadTemplate } from "../core/template-loader.js";

export class McProfilePopover extends HTMLElement {
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
    const template = await loadTemplate("/templates/profile-popover.html");
    this.shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector("[data-user-name]").textContent = this.#user?.displayName || "Guest";
    this.shadowRoot.querySelector("[data-user-email]").textContent = this.#user?.email || "";

    this.shadowRoot.querySelector("[data-command='profile.open']").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("profile-open", { bubbles: true, composed: true }));
    });

    this.shadowRoot.querySelector("[data-command='auth.logout']").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("logout", { bubbles: true, composed: true }));
    });
  }
}

customElements.define("mc-profile-popover", McProfilePopover);
