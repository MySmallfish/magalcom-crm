import { loadTemplate } from "../core/template-loader.js";

const iconMarkupByName = Object.freeze({
  home: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
    </svg>
  `,
  user: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>
      <path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `,
  apps: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="6" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
      <rect x="14" y="4" width="6" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
      <rect x="4" y="14" width="6" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
      <rect x="14" y="14" width="6" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
    </svg>
  `,
  leads: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 18.5h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M7 15V9.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M12 15V6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="M17 15v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
      <path d="m15.5 7.5 1.5-1.5 1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `,
  default: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3.5" fill="currentColor"></circle>
    </svg>
  `
});

function getFallbackInitial(title) {
  const candidate = Array.from(String(title || "").trim()).find((character) => /[\p{L}\p{N}]/u.test(character));
  return candidate ? candidate.toUpperCase() : "?";
}

export class McSideMenu extends HTMLElement {
  #items = [];
  #activeRoute = "/";

  static get observedAttributes() {
    return ["collapsed"];
  }

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

  set activeRoute(value) {
    this.#activeRoute = value || "/";
    this.render();
  }

  set collapsed(value) {
    this.toggleAttribute("collapsed", Boolean(value));
  }

  get collapsed() {
    return this.hasAttribute("collapsed");
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      void this.render();
    }
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
      if (item.route === this.#activeRoute) {
        button.classList.add("active");
      }

      if (this.collapsed) {
        button.title = item.title;
        button.setAttribute("aria-label", item.title);
      }

      const icon = document.createElement("span");
      icon.className = "menu-item-icon";
      const iconMarkup = item.icon ? iconMarkupByName[item.icon] : "";
      if (iconMarkup) {
        icon.innerHTML = iconMarkup;
      } else {
        icon.classList.add("menu-item-icon-fallback");
        icon.textContent = getFallbackInitial(item.title);
      }

      const label = document.createElement("span");
      label.className = "menu-item-label";
      label.textContent = item.title;

      button.append(icon, label);
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
