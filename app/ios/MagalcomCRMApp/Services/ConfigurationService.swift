import Foundation

enum ConfigurationError: LocalizedError {
    case authConfigurationMissing
    case invalidShellConfig
    case transport(String)
    case requestFailed(status: Int, payload: String)

    var errorDescription: String? {
        switch self {
        case .authConfigurationMissing:
            return "Authentication is not configured. The backend did not provide a valid mobile authentication configuration."
        case .invalidShellConfig:
            return "Could not read authentication configuration from backend service."
        case .transport(let details):
            return "Failed to reach backend configuration service: \(details)"
        case .requestFailed(let status, let payload):
            return "Could not load configuration (HTTP \(status)): \(payload)"
        }
    }
}

actor ConfigurationService {
    static let shared = ConfigurationService()

    private var configuration: AppConfiguration
    private var loadingTask: Task<AppConfiguration, Error>?
    private let jsonDecoder = JSONDecoder()

    init(initialConfiguration: AppConfiguration = .shared) {
        self.configuration = initialConfiguration
    }

    func configuration() async -> AppConfiguration {
        configuration
    }

    func resolveRuntimeConfiguration() async throws -> AppConfiguration {
        if let task = loadingTask {
            return try await task.value
        }

        let task = Task<AppConfiguration, Error> {
            try await self.fetchFromShellConfiguration()
        }
        loadingTask = task

        do {
            let resolved = try await task.value
            configuration = resolved
            loadingTask = nil
            return resolved
        } catch {
            loadingTask = nil
            throw error
        }
    }

    func resolveAuthConfiguration() async throws -> AppConfiguration {
        if configuration.isConfigured {
            return configuration
        }
        let resolved = try await resolveRuntimeConfiguration()
        guard resolved.isConfigured else {
            throw ConfigurationError.authConfigurationMissing
        }
        return resolved
    }

    private func fetchFromShellConfiguration() async throws -> AppConfiguration {
        let candidates = shellConfigBaseURLs()
        var lastError: Error?
        var attempts = [String]()
        for baseURL in candidates {
            do {
                return try await fetchFromShellConfiguration(baseURL: baseURL)
            } catch {
                attempts.append("\(baseURL): \(error.localizedDescription)")
                lastError = error
            }
        }
        if let lastError {
            throw ConfigurationError.transport(
                "Tried endpoints: [\(attempts.joined(separator: ", "))]. Last error: \(lastError.localizedDescription)"
            )
        }
        throw ConfigurationError.transport("No backend endpoint candidates available.")
    }

    private func shellConfigBaseURLs() -> [URL] {
        var candidates = [configuration.apiBaseURL]

        guard var components = URLComponents(url: configuration.apiBaseURL, resolvingAgainstBaseURL: false) else {
            return candidates
        }

        // In local dev, API is usually :7002 and shell config is served by WebApp on :7001.
        if components.port == 7002 {
            components.port = 7001
            if let webAppBase = components.url,
               !candidates.contains(where: { $0.absoluteString == webAppBase.absoluteString }) {
                candidates.append(webAppBase)
            }
            components.port = 7002
        }

        if let host = components.host?.lowercased(),
           let loopbackAlternate = host == "localhost" ? "127.0.0.1" : (host == "127.0.0.1" ? "localhost" : nil) {
            components.host = loopbackAlternate
            if let alternate = components.url,
               !candidates.contains(where: { $0.absoluteString == alternate.absoluteString }) {
                candidates.append(alternate)
            }

            // Also try WebApp port on loopback alternate in local dev.
            if components.port == 7002 {
                components.port = 7001
                if let alternateWebAppBase = components.url,
                   !candidates.contains(where: { $0.absoluteString == alternateWebAppBase.absoluteString }) {
                    candidates.append(alternateWebAppBase)
                }
            }
        }

        return candidates
    }

    private func fetchFromShellConfiguration(baseURL: URL) async throws -> AppConfiguration {
        let configURL = baseURL.appendingPathComponent("shell/config")
        var request = URLRequest(url: configURL)
        request.httpMethod = "GET"

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw ConfigurationError.invalidShellConfig
            }
            guard (200...299).contains(http.statusCode) else {
                let payload = String(data: data, encoding: .utf8) ?? "No response body"
                throw ConfigurationError.requestFailed(status: http.statusCode, payload: payload)
            }

            let payload = try jsonDecoder.decode(ShellConfigurationPayload.self, from: data)
            let auth = payload.authentication
            let localization = payload.localization

            let tenantId = (auth?.tenantId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let clientId = (auth?.clientId ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let scope = (auth?.scope ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

            let redirectUri = resolvedMobileCallbackRedirectUri(
                provided: auth?.redirectUri,
                fallback: configuration.redirectUri
            )

            let postLogoutRedirectUri = resolvedMobileCallbackRedirectUri(
                provided: auth?.postLogoutRedirectUri,
                fallback: configuration.postLogoutRedirectUri
            )

            let locale = normalizedLocale(localization?.locale ?? configuration.locale)
            let isRightToLeft = normalizedLayoutDirection(localization?.direction, locale: locale, fallback: configuration.isRightToLeft)
            let baseURL = URL(string: payload.apiBaseUrl ?? "") ?? configuration.apiBaseURL

            let hasValidAuthConfiguration = tenantId.isValidConfigValue
                && clientId.isValidConfigValue
                && scope.isValidConfigValue
                && redirectUri.isValidConfigValue
                && redirectUri.isNativeAppCallbackURL

            if hasValidAuthConfiguration {
                return AppConfiguration(
                    apiBaseURL: baseURL,
                    tenantId: tenantId,
                    clientId: clientId,
                    scope: scope,
                    redirectUri: redirectUri,
                    postLogoutRedirectUri: postLogoutRedirectUri,
                    locale: locale,
                    isRightToLeft: isRightToLeft
                )
            }

            return AppConfiguration(
                apiBaseURL: baseURL,
                tenantId: configuration.tenantId,
                clientId: configuration.clientId,
                scope: configuration.scope,
                redirectUri: configuration.redirectUri,
                postLogoutRedirectUri: configuration.postLogoutRedirectUri,
                locale: locale,
                isRightToLeft: isRightToLeft
            )
        } catch let error as ConfigurationError {
            throw error
        } catch {
            throw ConfigurationError.transport(error.localizedDescription)
        }
    }

    private func resolvedMobileCallbackRedirectUri(provided: String?, fallback: String) -> String {
        let trimmed = (provided ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.isValidConfigValue else {
            return fallback
        }
        guard trimmed.isNativeAppCallbackURL else {
            return fallback
        }
        return trimmed
    }

    private func normalizedLocale(_ value: String) -> String {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return "he"
        }
        return trimmed.lowercased().hasPrefix("he") ? "he" : "en"
    }

    private func normalizedLayoutDirection(_ value: String?, locale: String, fallback: Bool) -> Bool {
        guard let value else {
            return locale == "he" ? true : fallback
        }

        switch value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "rtl":
            return true
        case "ltr":
            return false
        default:
            return locale == "he" ? true : fallback
        }
    }
}

private struct ShellConfigurationPayload: Decodable {
    let apiBaseUrl: String?
    let authentication: ShellAuthenticationPayload?
    let localization: ShellLocalizationPayload?
}

private struct ShellAuthenticationPayload: Decodable {
    let mode: String?
    let tenantId: String?
    let clientId: String?
    let scope: String?
    let redirectUri: String?
    let postLogoutRedirectUri: String?
}

private struct ShellLocalizationPayload: Decodable {
    let locale: String?
    let direction: String?
}

private extension String {
    var isValidConfigValue: Bool {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && !trimmed.hasPrefix("REPLACE_WITH_")
    }

    var isNativeAppCallbackURL: Bool {
        guard let scheme = URLComponents(string: self)?.scheme?.lowercased() else {
            return false
        }
        return !scheme.isEmpty && scheme != "http" && scheme != "https"
    }
}
