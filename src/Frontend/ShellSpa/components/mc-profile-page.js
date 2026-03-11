import { loadTemplate } from "../core/template-loader.js";

export class McProfilePage extends HTMLElement {
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
    const template = await loadTemplate("/templates/profile-page.html");
    this.shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector("[data-label-name]").textContent = this.#labels.displayName || "Display Name";
    this.shadowRoot.querySelector("[data-label-email]").textContent = this.#labels.email || "Email";
    this.shadowRoot.querySelector("[data-label-subject]").textContent = this.#labels.subjectId || "Subject ID";
    this.shadowRoot.querySelector("[data-label-roles]").textContent = this.#labels.roles || "Roles";
    this.shadowRoot.querySelector("[data-label-language]").textContent = this.#labels.language || "Language";
    this.shadowRoot.querySelector("[data-language-help]").textContent = this.#labels.languageHelp || "";
    this.shadowRoot.querySelector("[data-logout-button]").textContent = this.#labels.logout || "Logout";
    this.shadowRoot.querySelector("[data-profile-name]").textContent = this.#user?.displayName || this.#labels.notAvailable || "N/A";
    this.shadowRoot.querySelector("[data-profile-email]").textContent = this.#user?.email || this.#labels.notAvailable || "N/A";
    this.shadowRoot.querySelector("[data-profile-subject]").textContent = this.#user?.subjectId || this.#labels.notAvailable || "N/A";
    this.shadowRoot.querySelector("[data-profile-roles]").textContent = (this.#user?.roles || []).join(", ") || this.#labels.none || "None";

    const localeSelect = this.shadowRoot.querySelector("[data-language-select]");
    localeSelect.value = this.#locale;
    localeSelect.innerHTML = `
      <option value="he">${this.#labels.hebrew || "Hebrew"}</option>
      <option value="en">${this.#labels.english || "English"}</option>
    `;
    localeSelect.value = this.#locale;
    localeSelect.addEventListener("change", () => {
      this.dispatchEvent(new CustomEvent("locale-change", {
        detail: { locale: localeSelect.value },
        bubbles: true,
        composed: true
      }));
    });

    this.shadowRoot.querySelector("[data-logout-button]").addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("logout", {
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define("mc-profile-page", McProfilePage);
