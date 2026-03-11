import { loadTemplate } from "../core/template-loader.js";

export class McGrid extends HTMLElement {
  #rows = [];
  #columns = [];
  #selectedRowKey = null;
  #rowKeyField = "id";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set rows(value) {
    this.#rows = value || [];
    this.render();
  }

  set columns(value) {
    this.#columns = value || [];
    this.render();
  }

  set selectedRowKey(value) {
    this.#selectedRowKey = value == null ? null : String(value);
    this.render();
  }

  set rowKeyField(value) {
    this.#rowKeyField = value || "id";
    this.render();
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    const template = await loadTemplate("/templates/grid.html");
    this.shadowRoot.innerHTML = template;

    const head = this.shadowRoot.querySelector("[data-grid-head]");
    const body = this.shadowRoot.querySelector("[data-grid-body]");
    const placeholder = this.shadowRoot.querySelector("[data-grid-placeholder]");
    placeholder.textContent = this.getAttribute("empty-label") || "No records";

    const columns = this.#resolveColumns();
    head.innerHTML = "";
    body.innerHTML = "";

    if (this.#rows.length === 0 || columns.length === 0) {
      placeholder.hidden = false;
      return;
    }

    placeholder.hidden = true;

    const headerRow = document.createElement("tr");
    for (const column of columns) {
      const cell = document.createElement("th");
      cell.textContent = column.label;
      headerRow.appendChild(cell);
    }
    head.appendChild(headerRow);

    for (const row of this.#rows) {
      const rowElement = document.createElement("tr");
      const rowKey = row?.[this.#rowKeyField];
      if (rowKey != null) {
        rowElement.dataset.rowKey = String(rowKey);
        rowElement.classList.add("row-selectable");
        if (String(rowKey) === this.#selectedRowKey) {
          rowElement.classList.add("row-selected");
        }

        rowElement.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("row-activate", {
            detail: { row, rowKey: String(rowKey) },
            bubbles: true,
            composed: true
          }));
        });
      }

      for (const column of columns) {
        const cell = document.createElement("td");
        const value = column.value
          ? column.value(row)
          : row[column.key];

        cell.textContent = value == null ? "" : String(value);
        rowElement.appendChild(cell);
      }

      body.appendChild(rowElement);
    }
  }

  #resolveColumns() {
    if (this.#columns.length > 0) {
      return this.#columns;
    }

    const first = this.#rows[0];
    if (!first || typeof first !== "object") {
      return [];
    }

    return Object.keys(first).map((key) => ({
      key,
      label: key
    }));
  }
}

customElements.define("mc-grid", McGrid);
