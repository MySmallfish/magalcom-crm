const MESSAGE_VERSION = "v1";
const MESSAGE_TYPE_CONTEXT = "magalcom.shell.context";
const MESSAGE_TYPE_EVENT = "magalcom.shell.event";
const MESSAGE_TYPE_COMMAND = "magalcom.miniapp.command";
const COMMAND_NAME = "miniapp.sql.query.execute";
const EVENT_SQL_RESULT = "miniapp.sql.query.result";
const EVENT_SQL_FAILED = "miniapp.sql.query.failed";

const WRITE_KEYWORDS = new Set(["INSERT", "UPDATE", "DELETE", "MERGE"]);

const state = {
  shellOrigin: null,
  activeWriteConsent: false,
  pending: new Map()
};

const elements = {
  status: document.getElementById("status"),
  output: document.getElementById("output"),
  form: document.getElementById("query-form"),
  queryInput: document.getElementById("query-input"),
  runButton: document.getElementById("run-button"),
  clearButton: document.getElementById("clear-button"),
  queryMeta: document.getElementById("query-meta"),
  consentBadge: document.getElementById("consent-badge")
};

if (!elements.status || !elements.output || !elements.form || !elements.queryInput || !elements.runButton || !elements.clearButton || !elements.queryMeta || !elements.consentBadge) {
  throw new Error("Mini App is missing required UI elements.");
}

function setStatus(message) {
  elements.status.textContent = message;
}

function resetOutput(message = "No query executed yet.") {
  elements.output.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function deriveShellOrigin() {
  if (state.shellOrigin) {
    return state.shellOrigin;
  }

  try {
    state.shellOrigin = new URL(document.referrer || window.location.href).origin;
  } catch {
    state.shellOrigin = "*";
  }

  return state.shellOrigin;
}

function isWriteQuery(sql) {
  const trimmed = stripSqlPrefix(sql).trim().toUpperCase();
  const firstToken = trimmed.split(/\s+/)[0] || "";
  return WRITE_KEYWORDS.has(firstToken);
}

function stripSqlPrefix(sql) {
  return sql
    .replace(/^\s*(?:--[^\n\r]*(?:\r\n|\n|$)|\/\*[\s\S]*?\*\/\s*)+/gm, "");
}

function renderRowArray(rows, columns) {
  if (rows.length === 0) {
    return `<p class="muted">No rows returned.</p>`;
  }

  const heads = columns.map((column) => `<th>${escapeHtml(column.name)} (${escapeHtml(column.dataType)})</th>`).join("");

  const bodyRows = rows.map((row) => {
    const cells = columns
      .map((column) => `<td>${escapeHtml(row.values?.[column.name] ?? "")}</td>`)
      .join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<table><thead><tr>${heads}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function renderResult(response, requestId) {
  const pending = state.pending.get(requestId);
  const queryLabel = pending ? pending.queryLabel : "Query";

  if (response?.message) {
    elements.output.innerHTML = `<p><strong>${escapeHtml(queryLabel)}</strong> · ${escapeHtml(response.message)}</p>`;
    return;
  }

  if (response?.isReadOnly) {
    elements.output.innerHTML = `${renderRowArray(response.rows || [], response.columns || [])}`;
    return;
  }

  const affected = typeof response.rowsAffected === "number" ? response.rowsAffected : 0;
  elements.output.innerHTML = `<p><strong>${escapeHtml(queryLabel)}</strong> completed. Rows affected: ${affected}.</p>`;
}

function showError(message, requestId) {
  const suffix = requestId ? ` (request: ${requestId})` : "";
  elements.output.innerHTML = `<p class="muted">${escapeHtml(message)}${escapeHtml(suffix)}</p>`;
}

function onContextMessage(event) {
  const message = event.data;
  if (!message || message.type !== MESSAGE_TYPE_CONTEXT || message.version !== MESSAGE_VERSION) {
    return;
  }

  state.shellOrigin = state.shellOrigin || event.origin;
  setStatus(`Connected as ${message.user?.displayName || "unknown"} (${message.user?.email || ""}).`);
  elements.queryMeta.textContent = "Write queries (INSERT/UPDATE/DELETE/MERGE) require consent once per page session.";
}

function onEventMessage(event) {
  const message = event.data;
  if (!message || message.type !== MESSAGE_TYPE_EVENT || message.version !== MESSAGE_VERSION) {
    return;
  }

  if (!message.eventType || typeof message.eventType !== "string") {
    return;
  }

  if (message.eventType !== EVENT_SQL_RESULT && message.eventType !== EVENT_SQL_FAILED) {
    return;
  }

  if (!message.payload?.requestId) {
    return;
  }

  const request = state.pending.get(message.payload.requestId);
  if (!request) {
    return;
  }

  state.pending.delete(message.payload.requestId);
  elements.runButton.disabled = false;

  if (message.eventType === EVENT_SQL_FAILED) {
    showError(message.payload.error || "Query execution failed.", message.payload.requestId);
    return;
  }

  if (message.payload.result?.requiresWriteConsent) {
    showError(message.payload.result.message || "Write consent is required for this query.", message.payload.requestId);
    return;
  }

  renderResult(message.payload.result, message.payload.requestId);
}

function sendCommand(payload) {
  const shellOrigin = deriveShellOrigin();
  const target = shellOrigin || "*";
  window.parent.postMessage({
    type: MESSAGE_TYPE_COMMAND,
    version: MESSAGE_VERSION,
    command: COMMAND_NAME,
    payload
  }, target);
}

function requestConsentForWrite() {
  const confirmed = window.confirm("This SQL statement can change data. Allow write queries for this session?");
  if (!confirmed) {
    return false;
  }

  state.activeWriteConsent = true;
  elements.consentBadge.textContent = "Write consent: granted for this session";
  return true;
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.shellOrigin) {
    setStatus("Waiting for shell context before running queries.");
    return;
  }

  const sql = elements.queryInput.value.trim();
  if (!sql) {
    showError("Enter a SQL statement to execute.");
    return;
  }

  const writeQuery = isWriteQuery(sql);
  if (writeQuery && !state.activeWriteConsent) {
    if (!requestConsentForWrite()) {
      showError("Write query cancelled. Grant write consent to execute.");
      return;
    }
  }

  const requestId = crypto.randomUUID();
  state.pending.set(requestId, {
    sql,
    queryLabel: "Query executed"
  });

  elements.runButton.disabled = true;
  setStatus("Running query...");
  sendCommand({
    requestId,
    sql,
    writeConsent: Boolean(state.activeWriteConsent)
  });

  elements.output.innerHTML = `<p class="muted">Executing ${writeQuery ? "write" : "read"} query...</p>`;
});

elements.clearButton.addEventListener("click", () => {
  elements.queryInput.value = "";
  resetOutput();
  setStatus("Ready.");
});

window.addEventListener("message", (event) => {
  onContextMessage(event);
  onEventMessage(event);
});
