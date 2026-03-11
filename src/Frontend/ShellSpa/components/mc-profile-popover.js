import { loadTemplate } from "../core/template-loader.js";

export class McProfilePopover extends HTMLElement {
  #user = null;
  #locale = "he";
  #labels = {};

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set user(value) {
    this.#user = value;
    this.render();
  }

  set locale(value) {
    this.#locale = value || "he";
    this.render();
  }

  set labels(value) {
    this.#labels = value || {};
    this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/profile-popover.html");
    this.shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector("[data-user-name]").textContent = this.#user?.displayName || this.#labels.guest || "Guest";
    this.shadowRoot.querySelector("[data-user-email]").textContent = this.#user?.email || "";
    this.shadowRoot.querySelector("[data-command='profile.open']").textContent = this.#labels.profile || "Profile";
    this.shadowRoot.querySelector("[data-command='auth.logout']").textContent = this.#labels.logout || "Logout";
    this.shadowRoot.querySelector("[data-language-label]").textContent = this.#labels.language || "Language";
    this.shadowRoot.querySelector("[data-locale='he']").textContent = this.#labels.hebrew || "Hebrew";
    this.shadowRoot.querySelector("[data-locale='en']").textContent = this.#labels.english || "English";

    for (const button of this.shadowRoot.querySelectorAll("[data-locale]")) {
      button.classList.toggle("active", button.dataset.locale === this.#locale);
      button.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("locale-change", {
          detail: { locale: button.dataset.locale },
          bubbles: true,
          composed: true
        }));
      });
    }

    this.shadowRoot.querySelector("[data-command='profile.open']").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("profile-open", { bubbles: true, composed: true }));
    });

    this.shadowRoot.querySelector("[data-command='auth.logout']").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("logout", { bubbles: true, composed: true }));
    });
  }
}

customElements.define("mc-profile-popover", McProfilePopover);
