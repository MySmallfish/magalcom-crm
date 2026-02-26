import { loadTemplate } from "../core/template-loader.js";

export class McForm extends HTMLElement {
  async connectedCallback() {
    const template = await loadTemplate("/templates/form.html");
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.shadowRoot.innerHTML = template;
  }
}

customElements.define("mc-form", McForm);
