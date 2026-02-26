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
      throw new Error(`API ${response.status}: ${text}`);
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

  getLeads() {
    return this.#request("/api/v1/leads");
  }
}
