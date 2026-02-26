export class AuthService {
  #config;
  #msalClient;
  #account;

  constructor(config) {
    this.#config = config;
  }

  async initialize() {
    if (this.#config.authentication?.disableAuthentication) {
      this.#account = {
        homeAccountId: "dev-user-001",
        name: "Development User",
        username: "developer@magalcom.local",
        idTokenClaims: {
          roles: ["Admin", "Sales"],
          oid: "dev-user-001"
        }
      };
      return;
    }

    await this.#ensureMsalLoaded();

    if (!this.#config.authentication.clientId || !this.#config.authentication.tenantId) {
      throw new Error("Entra authentication requires tenantId and clientId in shell configuration.");
    }

    this.#msalClient = new window.msal.PublicClientApplication({
      auth: {
        clientId: this.#config.authentication.clientId,
        authority: `https://login.microsoftonline.com/${this.#config.authentication.tenantId}`,
        redirectUri: window.location.origin
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
      return;
    }

    const accounts = this.#msalClient.getAllAccounts();
    this.#account = accounts.length > 0 ? accounts[0] : null;
  }

  async #ensureMsalLoaded() {
    if (window.msal) {
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js";
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load MSAL library from CDN."));
      document.head.appendChild(script);
    });

    if (!window.msal) {
      throw new Error("MSAL library is unavailable after script load.");
    }
  }

  async signIn() {
    if (this.#config.authentication?.disableAuthentication) {
      return;
    }

    const loginRequest = {
      scopes: ["openid", "profile", this.#config.authentication.scope]
    };

    const response = await this.#msalClient.loginPopup(loginRequest);
    this.#account = response.account;
  }

  async signOut() {
    if (this.#config.authentication?.disableAuthentication) {
      this.#account = null;
      return;
    }

    await this.#msalClient.logoutPopup({ account: this.#account });
    this.#account = null;
  }

  getUserContext() {
    if (!this.#account) {
      return null;
    }

    const roles = this.#account.idTokenClaims?.roles || [];

    return {
      subjectId: this.#account.idTokenClaims?.oid || this.#account.homeAccountId,
      displayName: this.#account.name,
      email: this.#account.username,
      roles
    };
  }

  async getAccessToken() {
    if (this.#config.authentication?.disableAuthentication) {
      return "dev-token";
    }

    if (!this.#account) {
      throw new Error("User is not authenticated.");
    }

    const tokenRequest = {
      account: this.#account,
      scopes: [this.#config.authentication.scope]
    };

    const response = await this.#msalClient.acquireTokenSilent(tokenRequest);
    return response.accessToken;
  }
}
