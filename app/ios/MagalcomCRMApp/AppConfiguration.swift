import Foundation

struct AppConfiguration {
    static let shared = AppConfiguration()

    let apiBaseURL: URL
    let tenantId: String
    let clientId: String
    let scope: String
    let redirectUri: String
    let postLogoutRedirectUri: String
    let locale: String
    let isRightToLeft: Bool

    var isConfigured: Bool {
        !tenantId.isPlaceholderValue &&
        !clientId.isPlaceholderValue &&
        !scope.isPlaceholderValue &&
        !redirectUri.isPlaceholderValue &&
        !postLogoutRedirectUri.isPlaceholderValue &&
        redirectScheme != nil
    }

    init(
        apiBaseURL: URL,
        tenantId: String,
        clientId: String,
        scope: String,
        redirectUri: String,
        postLogoutRedirectUri: String,
        locale: String,
        isRightToLeft: Bool
    ) {
        self.apiBaseURL = apiBaseURL
        self.tenantId = tenantId
        self.clientId = clientId
        self.scope = scope
        self.redirectUri = redirectUri
        self.postLogoutRedirectUri = postLogoutRedirectUri
        self.locale = locale
        self.isRightToLeft = isRightToLeft
    }

    var redirectScheme: String? {
        URLComponents(string: redirectUri)?.scheme
    }

    var isRedirectUriConfigured: Bool {
        !(redirectUri.isPlaceholderValue || redirectScheme?.isPlaceholderValue == true)
    }

    private init() {
        let bundle = Bundle.main

        let baseUrl = bundle.object(forInfoDictionaryKey: "API_BASE_URL") as? String ?? "REPLACE_WITH_API_BASE_URL"
        apiBaseURL = URL(string: baseUrl) ?? URL(string: "http://127.0.0.1:7002")!

        tenantId = bundle.object(forInfoDictionaryKey: "ENTRA_TENANT_ID") as? String ?? "REPLACE_WITH_TENANT_ID"
        clientId = bundle.object(forInfoDictionaryKey: "ENTRA_CLIENT_ID") as? String ?? "REPLACE_WITH_CLIENT_ID"
        scope = bundle.object(forInfoDictionaryKey: "ENTRA_SCOPE") as? String ?? "REPLACE_WITH_SCOPE"
        redirectUri = bundle.object(forInfoDictionaryKey: "ENTRA_REDIRECT_URI") as? String ?? "magalcomcrm://auth"
        postLogoutRedirectUri = bundle.object(forInfoDictionaryKey: "ENTRA_POST_LOGOUT_REDIRECT_URI") as? String ?? "magalcomcrm://auth"
        locale = bundle.object(forInfoDictionaryKey: "APP_DEFAULT_LOCALE") as? String ?? "he"
        let direction = (bundle.object(forInfoDictionaryKey: "APP_LAYOUT_DIRECTION") as? String ?? "rtl")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
        isRightToLeft = direction == "rtl"
    }
}

private extension String {
    var isPlaceholderValue: Bool {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty || trimmed.hasPrefix("REPLACE_WITH_")
    }
}
