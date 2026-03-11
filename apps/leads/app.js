const app = document.getElementById("app");

const DEFAULT_FILTERS = {
  search: "",
  ownerSubjectId: "",
  customerId: "",
  workTypeId: "",
  contractType: "",
  stage: "",
  offerStatus: "",
  dueDateFrom: "",
  dueDateTo: "",
  amountMin: "",
  amountMax: "",
  sortBy: "updatedAt"
};

const state = {
  shellContext: null,
  loadingContext: true,
  loadingData: false,
  saving: false,
  error: "",
  toast: null,
  view: "dashboard",
  metadata: null,
  leads: [],
  filters: { ...DEFAULT_FILTERS },
  form: createEmptyForm(),
  selectedLeadId: null
};

const allowedOrigins = new Set([window.location.origin]);
if (document.referrer) {
  try {
    allowedOrigins.add(new URL(document.referrer).origin);
  } catch {
    // Ignore malformed referrer; same-origin allowance still exists.
  }
}

const amountFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

window.addEventListener("message", onShellMessage);
app.addEventListener("click", onClick);
app.addEventListener("input", onInput);
app.addEventListener("change", onChange);

render();

setTimeout(() => {
  if (!state.shellContext) {
    state.loadingContext = false;
    render();
  }
}, 500);

function createEmptyForm() {
  return {
    id: "",
    customerId: "",
    projectName: "",
    comments: "",
    stage: "",
    isPerpetual: "",
    dueDate: "",
    offerStatus: "Open",
    actualAwardedAmount: "",
    qualificationAnswers: {},
    amountLines: [createEmptyAmountLine()],
    auditTrail: []
  };
}

function createEmptyAmountLine() {
  return {
    id: crypto.randomUUID(),
    workTypeId: "",
    amount: "",
    note: ""
  };
}

async function onShellMessage(event) {
  if (!allowedOrigins.has(event.origin)) {
    return;
  }

  const message = event.data;
  if (!message || message.type !== "magalcom.shell.context" || message.version !== "v1") {
    return;
  }

  state.shellContext = message;
  state.loadingContext = false;
  state.error = "";
  render();

  if (!state.metadata) {
    await loadModule();
  }
}

async function loadModule() {
  state.loadingData = true;
  render();

  try {
    const [metadata, leads] = await Promise.all([
      apiRequest("/api/v1/leads/metadata"),
      apiRequest("/api/v1/leads")
    ]);

    state.metadata = metadata;
    state.leads = leads;
    state.loadingData = false;
    state.toast = null;
    render();
  } catch (error) {
    state.loadingData = false;
    state.error = String(error.message || error);
    render();
  }
}

async function apiRequest(path, options = {}) {
  if (!state.shellContext?.accessToken) {
    throw new Error("Host context is missing an access token.");
  }

  const response = await fetch(`${state.shellContext.configuration.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.shellContext.accessToken}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      errorMessage = payload.error || payload.title || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || errorMessage;
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function onClick(event) {
  const target = event.target.closest("[data-action], [data-view]");
  if (!target) {
    return;
  }

  if (target.dataset.view) {
    state.view = target.dataset.view;
    render();
    return;
  }

  const { action } = target.dataset;

  if (action === "new-lead") {
    state.view = "form";
    state.selectedLeadId = null;
    state.form = createEmptyForm();
    state.toast = null;
    render();
    return;
  }

  if (action === "edit-lead") {
    const lead = state.leads.find((item) => item.id === target.dataset.leadId);
    if (!lead) {
      return;
    }

    state.selectedLeadId = lead.id;
    state.view = "form";
    state.form = mapLeadToForm(lead);
    state.toast = null;
    render();
    return;
  }

  if (action === "cancel-form") {
    state.view = "list";
    state.toast = null;
    render();
    return;
  }

  if (action === "add-line") {
    state.form.amountLines = [...state.form.amountLines, createEmptyAmountLine()];
    render();
    return;
  }

  if (action === "remove-line") {
    const index = Number(target.dataset.index);
    state.form.amountLines = state.form.amountLines.filter((_, itemIndex) => itemIndex !== index);
    if (state.form.amountLines.length === 0) {
      state.form.amountLines = [createEmptyAmountLine()];
    }
    render();
    return;
  }

  if (action === "clear-toast") {
    state.toast = null;
    render();
    return;
  }

  if (action === "reset-filters") {
    state.filters = { ...DEFAULT_FILTERS };
    render();
    return;
  }

  if (action === "apply-dashboard-filter") {
    const { filterKey, filterValue, filterLabel } = target.dataset;
    state.filters = { ...DEFAULT_FILTERS, [filterKey]: filterValue || "" };
    state.view = "list";
    state.toast = filterLabel
      ? { type: "success", message: `Filtered list by ${filterLabel}.` }
      : null;
    render();
    return;
  }

  if (action === "save-lead") {
    void saveLead();
  }
}

function onInput(event) {
  const field = event.target.dataset.formField;
  if (field) {
    state.form[field] = event.target.value;
    if (field === "customerId") {
      state.form.projectName = "";
    }
    render();
    return;
  }

  const filterField = event.target.dataset.filterField;
  if (filterField) {
    state.filters[filterField] = event.target.value;
    render();
    return;
  }

  const lineField = event.target.dataset.lineField;
  if (lineField) {
    const index = Number(event.target.dataset.index);
    state.form.amountLines = state.form.amountLines.map((line, lineIndex) =>
      lineIndex === index
        ? {
            ...line,
            [lineField]: event.target.value
          }
        : line
    );
    render();
  }
}

function onChange(event) {
  const questionCode = event.target.dataset.questionCode;
  if (questionCode) {
    state.form.qualificationAnswers = {
      ...state.form.qualificationAnswers,
      [questionCode]: event.target.value === "true"
    };
    render();
    return;
  }

  const toggleField = event.target.dataset.toggleField;
  if (toggleField) {
    state.form[toggleField] = event.target.value;
    render();
  }
}

async function saveLead() {
  const errors = validateForm();
  if (errors.length > 0) {
    state.toast = {
      type: "error",
      message: errors.join(" ")
    };
    render();
    return;
  }

  state.saving = true;
  state.toast = null;
  render();

  try {
    const payload = buildLeadPayload();
    const path = state.selectedLeadId
      ? `/api/v1/leads/${state.selectedLeadId}`
      : "/api/v1/leads";
    const method = state.selectedLeadId ? "PUT" : "POST";

    await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    const [metadata, leads] = await Promise.all([
      apiRequest("/api/v1/leads/metadata"),
      apiRequest("/api/v1/leads")
    ]);

    state.metadata = metadata;
    state.leads = leads;
    state.saving = false;
    state.view = "list";
    state.toast = {
      type: "success",
      message: state.selectedLeadId ? "Lead updated successfully." : "Lead created successfully."
    };
    render();
  } catch (error) {
    state.saving = false;
    state.toast = {
      type: "error",
      message: String(error.message || error)
    };
    render();
  }
}

function validateForm() {
  const errors = [];
  if (!state.form.customerId) {
    errors.push("Customer is required.");
  }

  if (!state.form.projectName.trim()) {
    errors.push("Project is required.");
  }

  const meaningfulLines = getMeaningfulAmountLines();
  meaningfulLines.forEach((line, index) => {
    if (!line.workTypeId) {
      errors.push(`Amount line ${index + 1} must include a work type.`);
    }

    if (!line.amount || Number(line.amount) <= 0) {
      errors.push(`Amount line ${index + 1} must include a positive amount.`);
    }
  });

  return errors;
}

function getMeaningfulAmountLines() {
  return state.form.amountLines.filter((line) =>
    line.workTypeId || line.amount || line.note.trim()
  );
}

function buildLeadPayload() {
  const projectMatch = getProjectMatch(state.form.customerId, state.form.projectName);
  return {
    customerId: state.form.customerId,
    projectId: projectMatch ? projectMatch.id : null,
    projectName: state.form.projectName.trim(),
    comments: state.form.comments.trim(),
    qualificationAnswers: (state.metadata?.qualificationQuestions || []).map((question) => ({
      questionCode: question.code,
      answer: Object.prototype.hasOwnProperty.call(state.form.qualificationAnswers, question.code)
        ? state.form.qualificationAnswers[question.code]
        : null
    })),
    stage: state.form.stage || null,
    isPerpetual: state.form.isPerpetual === "" ? null : state.form.isPerpetual === "true",
    dueDate: state.form.dueDate || null,
    offerStatus: state.form.offerStatus,
    actualAwardedAmount: state.form.actualAwardedAmount === "" ? null : Number(state.form.actualAwardedAmount),
    amountLines: getMeaningfulAmountLines().map((line) => ({
      id: line.id || null,
      workTypeId: line.workTypeId,
      amount: Number(line.amount),
      note: line.note.trim()
    }))
  };
}

function mapLeadToForm(lead) {
  const qualificationAnswers = {};
  (lead.qualificationAnswers || []).forEach((answer) => {
    if (answer.answer !== null) {
      qualificationAnswers[answer.questionCode] = answer.answer;
    }
  });

  return {
    id: lead.id,
    customerId: lead.customer.id,
    projectName: lead.project.name,
    comments: lead.comments || "",
    stage: lead.stage || "",
    isPerpetual:
      lead.isPerpetual === null || lead.isPerpetual === undefined
        ? ""
        : String(lead.isPerpetual),
    dueDate: lead.dueDate || "",
    offerStatus: lead.offerStatus || "Open",
    actualAwardedAmount:
      lead.actualAwardedAmount === null || lead.actualAwardedAmount === undefined
        ? ""
        : String(lead.actualAwardedAmount),
    qualificationAnswers,
    amountLines: ((lead.amountLines || []).length ? lead.amountLines : [createEmptyAmountLine()]).map((line) => ({
      id: line.id,
      workTypeId: line.workTypeId,
      amount: String(line.amount),
      note: line.note || ""
    })),
    auditTrail: lead.auditTrail || []
  };
}

function getProjectMatch(customerId, projectName) {
  const normalized = normalize(projectName);
  return (state.metadata?.projects || []).find((project) =>
    project.customerId === customerId && normalize(project.name) === normalized
  );
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getFilteredLeads() {
  const search = normalize(state.filters.search);

  const leads = (state.leads || []).filter((lead) => {
    if (
      search &&
      !normalize(`${lead.customer.name} ${lead.project.name} ${lead.comments}`).includes(search)
    ) {
      return false;
    }

    if (state.filters.ownerSubjectId && lead.owner.subjectId !== state.filters.ownerSubjectId) {
      return false;
    }

    if (state.filters.customerId && lead.customer.id !== state.filters.customerId) {
      return false;
    }

    if (state.filters.workTypeId && !lead.amountLines.some((line) => line.workTypeId === state.filters.workTypeId)) {
      return false;
    }

    if (state.filters.contractType === "perpetual" && lead.isPerpetual !== true) {
      return false;
    }

    if (state.filters.contractType === "auction" && lead.isPerpetual !== false) {
      return false;
    }

    if (state.filters.stage && lead.stage !== state.filters.stage) {
      return false;
    }

    if (state.filters.offerStatus && lead.offerStatus !== state.filters.offerStatus) {
      return false;
    }

    if (state.filters.dueDateFrom && (!lead.dueDate || lead.dueDate < state.filters.dueDateFrom)) {
      return false;
    }

    if (state.filters.dueDateTo && (!lead.dueDate || lead.dueDate > state.filters.dueDateTo)) {
      return false;
    }

    if (state.filters.amountMin && lead.metrics.totalAmount < Number(state.filters.amountMin)) {
      return false;
    }

    if (state.filters.amountMax && lead.metrics.totalAmount > Number(state.filters.amountMax)) {
      return false;
    }

    return true;
  });

  return leads.sort((left, right) => compareLeads(left, right, state.filters.sortBy));
}

function compareLeads(left, right, sortBy) {
  if (sortBy === "dueDate") {
    return String(left.dueDate || "9999-12-31").localeCompare(String(right.dueDate || "9999-12-31"));
  }

  if (sortBy === "totalAmount") {
    return right.metrics.totalAmount - left.metrics.totalAmount;
  }

  if (sortBy === "forecastAmount") {
    return right.metrics.forecastAmount - left.metrics.forecastAmount;
  }

  if (sortBy === "chanceToWin") {
    return right.metrics.chanceToWin - left.metrics.chanceToWin;
  }

  return String(right.updatedAtUtc).localeCompare(String(left.updatedAtUtc));
}

function getOwners() {
  const map = new Map();
  (state.leads || []).forEach((lead) => {
    map.set(lead.owner.subjectId, lead.owner);
  });
  return Array.from(map.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function getDashboardModel() {
  const activeLeads = (state.leads || []).filter((lead) =>
    lead.offerStatus === "Open" || lead.offerStatus === "Suspended"
  );
  const forecastEligible = activeLeads.filter((lead) => !lead.isIncomplete);
  const wins = (state.leads || []).filter((lead) => lead.offerStatus === "Win");

  const pipelineByOwner = groupBy(
    activeLeads,
    (lead) => lead.owner.displayName,
    (lead) => lead.metrics.totalAmount,
    (lead) => lead.owner.subjectId
  );
  const pipelineByCustomer = groupBy(activeLeads, (lead) => lead.customer.name, (lead) => lead.metrics.totalAmount, (lead) => lead.customer.id);
  const stageMix = groupBy(activeLeads, (lead) => lead.stage || "Unstaged", () => 1);

  const workTypeTotals = new Map();
  activeLeads.forEach((lead) => {
    (lead.amountTotalsByWorkType || []).forEach((total) => {
      const existing = workTypeTotals.get(total.workTypeId) || {
        id: total.workTypeId,
        label: total.workTypeName,
        value: 0
      };
      existing.value += total.amount;
      workTypeTotals.set(total.workTypeId, existing);
    });
  });

  const riskLeads = (state.leads || []).filter((lead) => {
    if (lead.isIncomplete || lead.offerStatus === "Suspended") {
      return true;
    }

    if (!lead.dueDate) {
      return false;
    }

    const dueDate = new Date(lead.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate - today) / 86400000);
    return diffDays <= 7;
  });

  const monthlyForecast = groupBy(
    forecastEligible.filter((lead) => lead.dueDate),
    (lead) => lead.dueDate.slice(0, 7),
    (lead) => lead.metrics.forecastAmount
  );

  return {
    cards: {
      openCount: activeLeads.length,
      pipelineAmount: sum(activeLeads, (lead) => lead.metrics.totalAmount),
      weightedForecast: sum(forecastEligible, (lead) => lead.metrics.forecastAmount),
      perpetualValue: sum(
        forecastEligible.filter((lead) => lead.isPerpetual === true),
        (lead) => lead.metrics.forecastAmount
      ),
      highConfidence: sum(forecastEligible, (lead) => lead.metrics.highConfidenceForecastAmount),
      wins: sum(wins, (lead) => lead.metrics.wonAmount)
    },
    pipelineByOwner,
    pipelineByCustomer,
    workTypeBreakdown: Array.from(workTypeTotals.values()).sort((left, right) => right.value - left.value),
    stageMix,
    monthlyForecast,
    riskLeads: riskLeads.sort((left, right) => compareLeads(left, right, "dueDate")).slice(0, 8)
  };
}

function groupBy(items, labelSelector, valueSelector, idSelector = null) {
  const map = new Map();
  items.forEach((item) => {
    const label = labelSelector(item);
    const key = idSelector ? idSelector(item) : label;
    const existing = map.get(key) || { id: key, label, value: 0 };
    existing.value += valueSelector(item);
    map.set(key, existing);
  });
  return Array.from(map.values()).sort((left, right) => right.value - left.value);
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function computeDraftMetrics() {
  const stageCoefficientMap = new Map(
    (state.metadata?.stageCoefficients || []).map((item) => [item.stage, Number(item.value)])
  );
  const questionMap = new Map(
    (state.metadata?.qualificationQuestions || []).map((item) => [item.code, item])
  );
  const workTypesById = new Map((state.metadata?.workTypes || []).map((item) => [item.id, item]));

  const lines = getMeaningfulAmountLines()
    .filter((line) => line.workTypeId && Number(line.amount) > 0)
    .map((line) => ({
      workType: workTypesById.get(line.workTypeId),
      amount: Number(line.amount)
    }))
    .filter((line) => line.workType);

  const totalAmount = lines.reduce((total, line) => total + line.amount, 0);
  const priceListAnswer = state.form.qualificationAnswers["customer-under-price-list"] === true;
  const qualificationScore = priceListAnswer
    ? 100
    : Array.from(questionMap.values()).reduce((total, question) => {
        if (question.isOverrideRule) {
          return total;
        }

        return total + (state.form.qualificationAnswers[question.code] === true ? Number(question.weight) : 0);
      }, 0);
  const qualificationContribution = qualificationScore * 0.3;
  const stageContribution = stageCoefficientMap.get(state.form.stage) || 0;
  const chanceToWin = Math.min(100, qualificationContribution + stageContribution);
  const perpetual = state.form.isPerpetual === "true";
  const forecastAmount = perpetual ? totalAmount : totalAmount * (chanceToWin / 100);
  const highConfidence = perpetual || chanceToWin >= 50 ? forecastAmount : 0;
  const wonAmount =
    state.form.offerStatus === "Win" && state.form.actualAwardedAmount !== ""
      ? Number(state.form.actualAwardedAmount)
      : 0;

  const missingFields = [];
  if (!state.form.stage) {
    missingFields.push("Stage");
  }
  if (!state.form.dueDate) {
    missingFields.push("Due Date");
  }
  if (state.form.isPerpetual === "") {
    missingFields.push("Perpetual Contract");
  }
  if (lines.length === 0) {
    missingFields.push("Amount Lines");
  }
  if (state.form.offerStatus === "Win" && state.form.actualAwardedAmount === "") {
    missingFields.push("Actual Awarded Amount");
  }

  return {
    totalAmount,
    qualificationScore,
    qualificationContribution,
    stageContribution,
    chanceToWin,
    forecastAmount,
    highConfidence,
    wonAmount,
    missingFields
  };
}

function render() {
  if (state.loadingContext) {
    app.innerHTML = `
      <section class="waiting-shell">
        <article class="waiting-card">
          <div class="eyebrow">Embedded CRM module</div>
          <h1>Waiting for host context</h1>
          <p>The leads app only starts after the parent CRM posts the current user, configuration, and access token.</p>
        </article>
      </section>
    `;
    return;
  }

  if (!state.shellContext) {
    app.innerHTML = `
      <section class="error-shell">
        <article class="error-card">
          <div class="eyebrow">Host handshake required</div>
          <h1>CRM context was not received</h1>
          <p>Open this module from the CRM shell so the iframe can receive a valid <code>postMessage</code> payload.</p>
        </article>
      </section>
    `;
    return;
  }

  if (state.error) {
    app.innerHTML = `
      <section class="error-shell">
        <article class="error-card">
          <div class="eyebrow">Load failed</div>
          <h1>Leads data could not be loaded</h1>
          <p>${escapeHtml(state.error)}</p>
        </article>
      </section>
    `;
    return;
  }

  if (!state.metadata || state.loadingData) {
    app.innerHTML = `
      <section class="waiting-shell">
        <article class="waiting-card">
          <div class="eyebrow">Connected as ${escapeHtml(state.shellContext.user.displayName)}</div>
          <h1>Syncing lead workspace</h1>
          <p>Loading customers, projects, work types, and the current pipeline from the CRM API.</p>
        </article>
      </section>
    `;
    return;
  }

  const dashboard = getDashboardModel();
  const filteredLeads = getFilteredLeads();
  const draftMetrics = computeDraftMetrics();

  app.innerHTML = `
    <div class="shell">
      ${renderHeader()}
      ${renderNav()}
      ${state.toast ? renderToast() : ""}
      ${state.view === "dashboard" ? renderDashboard(dashboard) : ""}
      ${state.view === "list" ? renderLeadList(filteredLeads) : ""}
      ${state.view === "form" ? renderLeadForm(draftMetrics) : ""}
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="header">
      <section class="hero">
        <div class="eyebrow">Leads Management mini app</div>
        <h1>Operational pipeline, not spreadsheet gravity.</h1>
        <p>This iframe receives CRM identity and token context from the host shell, then runs lead calculations server-side while keeping dashboard, list, and form workflows in one module.</p>
        <div class="hero-meta">
          <div>
            <small class="muted">Signed in</small>
            <strong>${escapeHtml(state.shellContext.user.displayName)}</strong>
          </div>
          <div>
            <small class="muted">Environment</small>
            <strong>${escapeHtml(state.shellContext.environment)}</strong>
          </div>
          <div>
            <small class="muted">Customers</small>
            <strong>${state.metadata.customers.length}</strong>
          </div>
          <div>
            <small class="muted">Open leads</small>
            <strong>${getDashboardModel().cards.openCount}</strong>
          </div>
        </div>
      </section>
      <aside class="meta-card">
        <div class="meta-row">
          <span class="muted">Host user</span>
          <strong>${escapeHtml(state.shellContext.user.email)}</strong>
        </div>
        <div class="meta-row">
          <span class="muted">Roles</span>
          <span>${state.shellContext.user.roles.map((role) => `<span class="chip">${escapeHtml(role)}</span>`).join("")}</span>
        </div>
        <div class="meta-row">
          <span class="muted">API base</span>
          <code>${escapeHtml(state.shellContext.configuration.apiBaseUrl)}</code>
        </div>
        <div class="meta-row">
          <span class="muted">Token mode</span>
          <span class="chip mono">memory only</span>
        </div>
      </aside>
    </header>
  `;
}

function renderNav() {
  return `
    <nav class="nav" data-testid="view-nav">
      <button type="button" data-view="dashboard" class="${state.view === "dashboard" ? "active" : ""}">Dashboard</button>
      <button type="button" data-view="list" class="${state.view === "list" ? "active" : ""}">Lead List</button>
      <button type="button" data-action="new-lead" class="${state.view === "form" && !state.selectedLeadId ? "active" : ""}" data-testid="new-lead-button">New Lead</button>
    </nav>
  `;
}

function renderToast() {
  return `
    <section class="toast ${escapeHtml(state.toast.type)}">
      <div class="meta-row">
        <strong>${escapeHtml(state.toast.message)}</strong>
        <button type="button" class="ghost-button" data-action="clear-toast">Dismiss</button>
      </div>
    </section>
  `;
}

function renderDashboard(model) {
  return `
    <section class="cards-grid panel">
      <article class="metric-card">
        <small>Open leads</small>
        <strong>${model.cards.openCount}</strong>
      </article>
      <article class="metric-card">
        <small>Pipeline amount</small>
        <strong>${formatAmount(model.cards.pipelineAmount)}</strong>
      </article>
      <article class="metric-card">
        <small>Weighted forecast</small>
        <strong>${formatAmount(model.cards.weightedForecast)}</strong>
      </article>
      <article class="metric-card">
        <small>Perpetual value</small>
        <strong>${formatAmount(model.cards.perpetualValue)}</strong>
      </article>
      <article class="metric-card">
        <small>Wins</small>
        <strong>${formatAmount(model.cards.wins)}</strong>
      </article>
    </section>
    <section class="dashboard-grid">
      <article class="table-card">
        <h3>Pipeline by owner</h3>
        ${renderBarList(model.pipelineByOwner, "ownerSubjectId")}
      </article>
      <article class="table-card">
        <h3>Stage mix</h3>
        <div class="stat-grid">
          ${model.stageMix.map((item) => `
            <div class="stat-block">
              <small>${escapeHtml(item.label)}</small>
              <strong>${Math.round(item.value)}</strong>
            </div>
          `).join("") || `<p class="empty-state">No stage data available yet.</p>`}
        </div>
      </article>
    </section>
    <section class="dashboard-grid">
      <article class="table-card">
        <h3>Top customers</h3>
        ${renderBarList(model.pipelineByCustomer, "customerId")}
      </article>
      <article class="table-card">
        <h3>Work type concentration</h3>
        ${renderBarList(model.workTypeBreakdown, "workTypeId")}
      </article>
    </section>
    <section class="dashboard-grid">
      <article class="table-card">
        <h3>Monthly forecast</h3>
        ${renderBarList(model.monthlyForecast.map((item) => ({ ...item, label: formatMonth(item.label) })), null)}
      </article>
      <article class="table-card">
        <h3>Risk widget</h3>
        <div class="risk-list">
          ${model.riskLeads.map((lead) => `
            <button type="button" class="ghost-button risk-item" data-action="edit-lead" data-lead-id="${lead.id}">
              <span>
                <strong>${escapeHtml(lead.customer.name)}</strong><br />
                <span class="muted">${escapeHtml(lead.project.name)}</span>
              </span>
              <span class="${lead.isIncomplete ? "warning-text" : "danger-text"}">
                ${lead.isIncomplete ? "Incomplete" : lead.offerStatus}
              </span>
            </button>
          `).join("") || `<p class="empty-state">No leads currently require immediate action.</p>`}
        </div>
      </article>
    </section>
  `;
}

function renderBarList(items, filterKey) {
  if (!items.length) {
    return `<p class="empty-state">No data available yet.</p>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="bar-list">
      ${items.map((item) => `
        <div class="bar-row">
          <div class="bar-meta">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${formatAmount(item.value)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.max(6, (item.value / max) * 100)}%"></div>
          </div>
          ${filterKey ? `
            <div class="inline-actions">
              <button type="button" class="soft-button" data-action="apply-dashboard-filter" data-filter-key="${filterKey}" data-filter-value="${item.id}" data-filter-label="${escapeHtml(item.label)}">Open filtered list</button>
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderLeadList(leads) {
  return `
    <section class="panel">
      <div class="toolbar">
        <div>
          <h2>Lead List</h2>
          <p class="helper-text">Filter by owner, customer, work type, contract type, stage, status, due date, and amount. Dashboard drill-downs land here without clearing session filters.</p>
        </div>
        <div class="toolbar-actions">
          <button type="button" class="primary-button" data-action="new-lead" data-testid="lead-list-new">New Lead</button>
          <button type="button" class="ghost-button" data-action="reset-filters">Reset Filters</button>
        </div>
      </div>
      <div class="filter-grid">
        ${renderFilterField("Search", "search", "search", "Search customer or project")}
        ${renderSelectFilter("Owner", "ownerSubjectId", getOwners().map((owner) => ({ value: owner.subjectId, label: owner.displayName })))}
        ${renderSelectFilter("Customer", "customerId", state.metadata.customers.map((customer) => ({ value: customer.id, label: customer.name })))}
        ${renderSelectFilter("Work Type", "workTypeId", state.metadata.workTypes.filter((item) => item.isActive).map((workType) => ({ value: workType.id, label: workType.name })))}
        ${renderSelectFilter("Contract Type", "contractType", [{ value: "perpetual", label: "Perpetual" }, { value: "auction", label: "Auction / One-time" }])}
        ${renderSelectFilter("Stage", "stage", ["Before", "Approaching", "Sent"].map((value) => ({ value, label: value })))}
        ${renderSelectFilter("Offer Status", "offerStatus", ["Open", "Win", "Lose", "Suspended", "Cancelled"].map((value) => ({ value, label: value })))}
        ${renderFilterField("Due from", "date", "dueDateFrom")}
        ${renderFilterField("Due to", "date", "dueDateTo")}
        ${renderFilterField("Amount min", "number", "amountMin")}
        ${renderFilterField("Amount max", "number", "amountMax")}
        ${renderSelectFilter("Sort By", "sortBy", [
          { value: "updatedAt", label: "Last Updated" },
          { value: "dueDate", label: "Due Date" },
          { value: "totalAmount", label: "Total Amount" },
          { value: "forecastAmount", label: "Forecast Amount" },
          { value: "chanceToWin", label: "Chance to Win" }
        ])}
      </div>
    </section>
    <section class="table-card">
      <h3>${leads.length} matching lead${leads.length === 1 ? "" : "s"}</h3>
      <div class="table-scroll">
        <table data-testid="lead-table">
          <thead>
            <tr>
              <th>Customer / Project</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Stage</th>
              <th>Total</th>
              <th>Forecast</th>
              <th>Chance</th>
              <th>Due</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${leads.map((lead) => `
              <tr data-testid="lead-row-${lead.id}">
                <td>
                  <strong>${escapeHtml(lead.customer.name)}</strong><br />
                  <span class="muted">${escapeHtml(lead.project.name)}</span>
                </td>
                <td>${escapeHtml(lead.owner.displayName)}</td>
                <td><span class="chip status-${lead.offerStatus.toLowerCase()}">${escapeHtml(lead.offerStatus)}</span></td>
                <td>${escapeHtml(lead.stage || "Incomplete")}</td>
                <td>${formatAmount(lead.metrics.totalAmount)}</td>
                <td>${formatAmount(lead.metrics.forecastAmount)}</td>
                <td>${formatPercent(lead.metrics.chanceToWin)}</td>
                <td>${lead.dueDate ? formatDate(lead.dueDate) : "Not set"}</td>
                <td>${formatDateTime(lead.updatedAtUtc)}</td>
                <td><button type="button" class="soft-button" data-action="edit-lead" data-lead-id="${lead.id}">Open</button></td>
              </tr>
            `).join("") || `
              <tr>
                <td colspan="10" class="empty-state">No leads match the current filter set.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderLeadForm(draftMetrics) {
  const questions = state.metadata.qualificationQuestions || [];
  const workTypeOptions = state.metadata.workTypes
    .filter((item) => item.isActive || state.form.amountLines.some((line) => line.workTypeId === item.id))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const customerProjects = state.metadata.projects.filter((project) => project.customerId === state.form.customerId);

  return `
    <section class="toolbar">
      <div>
        <h2>${state.selectedLeadId ? "Edit Lead" : "New Lead"}</h2>
        <p class="helper-text">Customer comes from CRM data. Project can reuse a customer project or create a new unique one. Calculated values are previewed here but remain server-authoritative when saved.</p>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="ghost-button" data-action="cancel-form">Back to List</button>
        <button type="button" class="primary-button" data-action="save-lead" data-testid="save-lead-button">${state.saving ? "Saving..." : "Save Lead"}</button>
      </div>
    </section>
    <section class="form-layout">
      <div>
        <article class="panel form-section">
          <h3>Business context</h3>
          <div class="field-grid">
            <div class="field">
              <label for="customer">Customer</label>
              <select id="customer" data-form-field="customerId" data-testid="customer-select">
                <option value="">Select CRM customer</option>
                ${state.metadata.customers.map((customer) => `
                  <option value="${customer.id}" ${state.form.customerId === customer.id ? "selected" : ""}>
                    ${escapeHtml(customer.name)}
                  </option>
                `).join("")}
              </select>
            </div>
            <div class="field">
              <label for="project">Project</label>
              <input id="project" list="project-suggestions" value="${escapeHtml(state.form.projectName)}" data-form-field="projectName" data-testid="project-input" placeholder="Reuse or create a project" />
              <datalist id="project-suggestions">
                ${customerProjects.map((project) => `<option value="${escapeHtml(project.name)}"></option>`).join("")}
              </datalist>
            </div>
            <div class="field">
              <label for="offer-status">Offer Status</label>
              <select id="offer-status" data-form-field="offerStatus" data-testid="offer-status-select">
                ${["Open", "Win", "Lose", "Suspended", "Cancelled"].map((status) => `
                  <option value="${status}" ${state.form.offerStatus === status ? "selected" : ""}>${status}</option>
                `).join("")}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="comments">Comments</label>
            <textarea id="comments" data-form-field="comments" data-testid="comments-input" placeholder="Capture deal context, blockers, and action items.">${escapeHtml(state.form.comments)}</textarea>
          </div>
        </article>

        <article class="panel form-section">
          <h3>Qualification answers</h3>
          <div class="summary-grid">
            ${questions.map((question, index) => `
              <fieldset class="binary-fieldset">
                <legend>${index + 1}. ${escapeHtml(question.label)}</legend>
                <div class="binary-options">
                  <label>
                    <input type="radio" name="question-${question.code}" value="true" data-question-code="${question.code}" ${state.form.qualificationAnswers[question.code] === true ? "checked" : ""} />
                    Yes
                  </label>
                  <label>
                    <input type="radio" name="question-${question.code}" value="false" data-question-code="${question.code}" ${state.form.qualificationAnswers[question.code] === false ? "checked" : ""} />
                    No
                  </label>
                  <span class="chip">${question.isOverrideRule ? "Override rule" : `${question.weight}% weight`}</span>
                </div>
              </fieldset>
            `).join("")}
          </div>
        </article>

        <article class="panel form-section">
          <h3>Pipeline stage and outcome</h3>
          <div class="field-grid">
            <fieldset class="binary-fieldset">
              <legend>Stage</legend>
              <div class="stage-picker" data-testid="stage-picker">
                ${["Before", "Approaching", "Sent"].map((stage) => `
                  <label>
                    <input type="radio" name="lead-stage" value="${stage}" data-toggle-field="stage" ${state.form.stage === stage ? "checked" : ""} />
                    ${stage}
                  </label>
                `).join("")}
              </div>
            </fieldset>
            <fieldset class="binary-fieldset">
              <legend>Perpetual contract?</legend>
              <div class="binary-options" data-testid="perpetual-toggle">
                <label>
                  <input type="radio" name="is-perpetual" value="true" data-toggle-field="isPerpetual" ${state.form.isPerpetual === "true" ? "checked" : ""} />
                  Yes
                </label>
                <label>
                  <input type="radio" name="is-perpetual" value="false" data-toggle-field="isPerpetual" ${state.form.isPerpetual === "false" ? "checked" : ""} />
                  No
                </label>
              </div>
            </fieldset>
            <div class="field">
              <label for="due-date">Due date</label>
              <input id="due-date" type="date" value="${escapeHtml(state.form.dueDate)}" data-form-field="dueDate" data-testid="due-date-input" />
            </div>
          </div>
          <div class="field-grid">
            <div class="field">
              <label for="actual-awarded">Actual awarded amount</label>
              <input id="actual-awarded" type="number" min="0" step="0.01" value="${escapeHtml(state.form.actualAwardedAmount)}" data-form-field="actualAwardedAmount" data-testid="actual-awarded-input" />
            </div>
          </div>
        </article>

        <article class="panel form-section">
          <div class="meta-row">
            <div>
              <h3>Amount lines</h3>
              <p class="helper-text">Amounts are captured per work type. Total amount is always calculated from these lines.</p>
            </div>
            <button type="button" class="soft-button" data-action="add-line" data-testid="add-amount-line">Add line</button>
          </div>
          <div class="amount-lines">
            ${state.form.amountLines.map((line, index) => `
              <div class="amount-line" data-testid="amount-line-${index}">
                <div class="field">
                  <label>Work Type</label>
                  <select data-line-field="workTypeId" data-index="${index}" data-testid="amount-line-worktype-${index}">
                    <option value="">Select type</option>
                    ${workTypeOptions.map((workType) => `
                      <option value="${workType.id}" ${line.workTypeId === workType.id ? "selected" : ""}>${escapeHtml(workType.name)}</option>
                    `).join("")}
                  </select>
                </div>
                <div class="field">
                  <label>Amount</label>
                  <input type="number" min="0" step="0.01" value="${escapeHtml(line.amount)}" data-line-field="amount" data-index="${index}" data-testid="amount-line-amount-${index}" />
                </div>
                <div class="field">
                  <label>Note</label>
                  <input value="${escapeHtml(line.note)}" data-line-field="note" data-index="${index}" data-testid="amount-line-note-${index}" placeholder="Optional line note" />
                </div>
                <div class="field">
                  <label>&nbsp;</label>
                  <button type="button" class="danger-button" data-action="remove-line" data-index="${index}">Remove</button>
                </div>
              </div>
            `).join("")}
          </div>
        </article>

        ${state.form.auditTrail.length ? `
          <article class="panel form-section">
            <h3>Audit trail</h3>
            <div class="audit-list">
              ${state.form.auditTrail.map((entry) => `
                <div class="audit-item">
                  <span>
                    <strong>${escapeHtml(entry.action)}</strong><br />
                    <span class="muted">${escapeHtml(entry.summary)}</span>
                  </span>
                  <span class="muted">${escapeHtml(entry.changedBy)} · ${formatDateTime(entry.changedAtUtc)}</span>
                </div>
              `).join("")}
            </div>
          </article>
        ` : ""}
      </div>

      <aside class="summary-grid">
        <article class="sidebar-card">
          <h3>Live calculations</h3>
          <div class="summary-list">
            ${renderSummaryRow("Total Amount", formatAmount(draftMetrics.totalAmount))}
            ${renderSummaryRow("Qualification Score", formatPercent(draftMetrics.qualificationScore))}
            ${renderSummaryRow("Qualification Contribution", formatPercent(draftMetrics.qualificationContribution))}
            ${renderSummaryRow("Stage Contribution", formatPercent(draftMetrics.stageContribution))}
            ${renderSummaryRow("Chance to Win", formatPercent(draftMetrics.chanceToWin))}
            ${renderSummaryRow("Forecast Amount", formatAmount(draftMetrics.forecastAmount))}
            ${renderSummaryRow("High-Confidence Forecast", formatAmount(draftMetrics.highConfidence))}
            ${renderSummaryRow("Won Amount", formatAmount(draftMetrics.wonAmount))}
          </div>
        </article>
        <article class="sidebar-card">
          <h3>Forecast inclusion</h3>
          ${draftMetrics.missingFields.length
            ? `<p class="warning-text">Incomplete until these fields are supplied:</p>
               <div class="chip-row">
                 ${draftMetrics.missingFields.map((field) => `<span class="chip">${escapeHtml(field)}</span>`).join("")}
               </div>`
            : `<p class="muted">This lead is complete enough to participate in forecast widgets.</p>`}
        </article>
        <article class="sidebar-card">
          <h3>Current owner</h3>
          <strong>${escapeHtml(state.shellContext.user.displayName)}</strong>
          <p class="helper-text">${escapeHtml(state.shellContext.user.email)}</p>
        </article>
      </aside>
    </section>
  `;
}

function renderSummaryRow(label, value) {
  return `
    <div class="summary-row">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderFilterField(label, type, field, placeholder = "") {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input type="${type}" value="${escapeHtml(state.filters[field])}" data-filter-field="${field}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

function renderSelectFilter(label, field, options) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select data-filter-field="${field}">
        <option value="">All</option>
        ${options.map((option) => `
          <option value="${option.value}" ${state.filters[field] === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
        `).join("")}
      </select>
    </div>
  `;
}

function formatAmount(value) {
  return `${amountFormat.format(Number(value || 0))}`;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function formatMonth(value) {
  if (!value) {
    return "No due date";
  }

  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
