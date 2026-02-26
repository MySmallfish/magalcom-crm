window.MAGALCOM_CONFIG = {
  apiBaseUrl: "http://localhost:7002",
  environment: "Development",
  authentication: {
    mode: "msal",
    disableAuthentication: true,
    tenantId: "",
    clientId: "",
    scope: "api://your-api-client-id/.default"
  },
  features: {
    leadsModule: true,
    miniAppsExternalOrigins: false,
    biChatScaffold: true
  },
  miniApps: {
    allowedOrigins: ["http://localhost:7001"]
  }
};
