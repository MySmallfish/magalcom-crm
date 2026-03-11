import { loadTemplate } from "../core/template-loader.js";

export class McForm extends HTMLElement {
  #schema = [];
  #values = {};

  static get observedAttributes() {
    return ["submit-label"];
  }

  set schema(value) {
    this.#schema = value || [];
    this.render();
  }

  set values(value) {
    this.#values = value || {};
    this.render();
  }

  async connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    await this.render();
  }

  async attributeChangedCallback() {
    if (this.isConnected) {
      await this.render();
    }
  }

  async render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    const template = await loadTemplate("/templates/form.html");
    this.shadowRoot.innerHTML = template;

    const fieldsHost = this.shadowRoot.querySelector("[data-form-fields]");
    const form = this.shadowRoot.querySelector("[data-form]");
    const submitButton = this.shadowRoot.querySelector("[data-submit]");
    const submitLabel = this.getAttribute("submit-label") || "Submit";
    submitButton.textContent = submitLabel;

    for (const field of this.#schema) {
      const label = document.createElement("label");
      label.className = field.fullWidth ? "field field-wide" : "field";

      const title = document.createElement("span");
      title.textContent = field.label || field.name;
      label.appendChild(title);

      const input = field.type === "textarea"
        ? document.createElement("textarea")
        : field.type === "select"
          ? document.createElement("select")
          : document.createElement("input");

      if (field.type && field.type !== "textarea" && field.type !== "select") {
        input.type = field.type;
      }

      input.name = field.name;
      input.placeholder = field.placeholder || "";
      input.required = Boolean(field.required);
      input.readOnly = Boolean(field.readOnly);
      input.value = this.#values[field.name] ?? "";
      if (field.min != null) {
        input.min = String(field.min);
      }

      if (field.max != null) {
        input.max = String(field.max);
      }

      if (field.step != null) {
        input.step = String(field.step);
      }

      if (field.rows != null && field.type === "textarea") {
        input.rows = Number(field.rows);
      }

      if (field.type === "select") {
        for (const option of field.options || []) {
          const optionElement = document.createElement("option");
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          if (String(option.value) === String(this.#values[field.name] ?? "")) {
            optionElement.selected = true;
          }

          input.appendChild(optionElement);
        }
      }

      label.appendChild(input);

      if (field.description) {
        const description = document.createElement("small");
        description.textContent = field.description;
        label.appendChild(description);
      }

      fieldsHost.appendChild(label);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = {};
      const controls = fieldsHost.querySelectorAll("input, textarea, select");
      for (const control of controls) {
        data[control.name] = control.value;
      }

      this.dispatchEvent(new CustomEvent("form-submit", {
        detail: data,
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define("mc-form", McForm);
