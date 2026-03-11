const MSAL_BROWSER_SCRIPT_PATH = "/assets/vendor/msal-browser.min.js";

function isConfigured(value) {
  return typeof value === "string" && value.trim() !== "" && !value.startsWith("REPLACE_WITH_");
}

function isInteractionRequired(error) {
  const code = error?.errorCode || error?.code || "";
  return [
    "interaction_required",
    "login_required",
    "consent_required",
    "no_tokens_found",
    "token_refresh_required"
  ].includes(code);
}

export class AuthService {
  #config;
  #msalClient;
  #account;

  constructor(config) {
    this.#config = config;
  }

  async initialize() {
    await this.#ensureMsalLoaded();

    const entra = this.#getEntraConfig();
    this.#msalClient = new window.msal.PublicClientApplication({
      auth: {
        clientId: entra.clientId,
        authority: `https://login.microsoftonline.com/${entra.tenantId}`,
        redirectUri: entra.redirectUri,
        postLogoutRedirectUri: entra.postLogoutRedirectUri,
        navigateToLoginRequestUrl: true
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
      }
    });

    await this.#msalClient.initialize();

    const redirectResult = await this.#msalClient.handleRedirectPromise();
    if (redirectResult?.account) {
      this.#account = redirectResult.account;
      this.#msalClient.setActiveAccount(this.#account);
      return;
    }

    this.#account = this.#msalClient.getActiveAccount() || this.#msalClient.getAllAccounts()[0] || null;
    if (this.#account) {
      this.#msalClient.setActiveAccount(this.#account);
    }
  }

  async #ensureMsalLoaded() {
    if (window.msal) {
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = MSAL_BROWSER_SCRIPT_PATH;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load the Microsoft Authentication Library from ${MSAL_BROWSER_SCRIPT_PATH}.`));
      document.head.appendChild(script);
    });

    if (!window.msal) {
      throw new Error("MSAL library is unavailable after script load.");
    }
  }

  #getEntraConfig() {
    const authentication = this.#config.authentication || {};
    const redirectUri = authentication.redirectUri || `${window.location.origin}/`;
    const postLogoutRedirectUri = authentication.postLogoutRedirectUri || redirectUri;

    if (!isConfigured(authentication.tenantId) || !isConfigured(authentication.clientId) || !isConfigured(authentication.scope)) {
      throw new Error("Shell authentication is not configured. Set TenantId, SpaClientId, and Scope in appsettings.");
    }

    return {
      tenantId: authentication.tenantId,
      clientId: authentication.clientId,
      scope: authentication.scope,
      redirectUri,
      postLogoutRedirectUri
    };
  }

  #getLoginScopes() {
    const { scope } = this.#getEntraConfig();
    return [...new Set(["openid", "profile", "offline_access", scope].filter(Boolean))];
  }

  async signIn() {
    await this.#msalClient.loginRedirect({
      scopes: this.#getLoginScopes()
    });
  }

  async signOut() {
    const { postLogoutRedirectUri } = this.#getEntraConfig();
    await this.#msalClient.logoutRedirect({
      account: this.#account || this.#msalClient.getActiveAccount() || undefined,
      postLogoutRedirectUri
    });
  }

  getUserContext() {
    if (!this.#account) {
      return null;
    }

    const claims = this.#account.idTokenClaims || {};
    const roles = Array.isArray(claims.roles) ? claims.roles : [];

    return {
      subjectId: claims.oid || this.#account.homeAccountId,
      displayName: this.#account.name || claims.name || "",
      email: this.#account.username || claims.preferred_username || "",
      roles
    };
  }

  async getAccessToken() {
    if (!this.#account) {
      throw new Error("User is not authenticated.");
    }

    const tokenRequest = {
      account: this.#account,
      scopes: [this.#getEntraConfig().scope]
    };

    try {
      const response = await this.#msalClient.acquireTokenSilent(tokenRequest);
      return response.accessToken;
    } catch (error) {
      if (isInteractionRequired(error)) {
        await this.#msalClient.acquireTokenRedirect(tokenRequest);
      }

      throw error;
    }
  }
}
