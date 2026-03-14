export class ApiClient {
  #baseUrl;
  #authService;

  constructor(baseUrl, authService) {
    this.#baseUrl = baseUrl.replace(/\/$/, "");
    this.#authService = authService;
  }

  async #request(path, options = {}) {
    const token = await this.#authService.getAccessToken();

    const response = await fetch(`${this.#baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();

      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        // Ignore payload parsing failures for non-json responses.
      }

      const message = typeof payload === "object" && payload !== null && "message" in payload
        ? payload.message
        : text;

      const error = new Error(`API ${response.status}: ${message || "Request failed"}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  getMe() {
    return this.#request("/api/v1/me");
  }

  getSitemap() {
    return this.#request("/api/v1/sitemap");
  }

  getMiniApps() {
    return this.#request("/api/v1/miniapps");
  }

  executeSqlQuery(sql, writeConsent = false) {
    return this.#request("/api/v1/admin/sql/query", {
      method: "POST",
      body: JSON.stringify({
        sql,
        writeConsent
      })
    });
  }
}
