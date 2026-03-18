import Foundation
import AuthenticationServices
import UIKit

@MainActor
final class AuthService: NSObject, ObservableObject, TokenProvider, ASWebAuthenticationPresentationContextProviding {
    enum AuthError: LocalizedError {
        case configurationMissing
        case authorizationURLInvalid
        case missingAuthorizationCode
        case authError(String)
        case stateMismatch
        case tokenNotFound
        case tokenExchangeFailed(String)

        var errorDescription: String? {
            switch self {
            case .configurationMissing:
                return "Authentication is not configured. Missing or unsupported callback URL for mobile login."
            case .authorizationURLInvalid:
                return "Could not build the Microsoft login URL."
            case .missingAuthorizationCode:
                return "Login did not return an authorization code."
            case .authError(let details):
                return "Login failed: \(details)"
            case .stateMismatch:
                return "Login state mismatch. Please retry."
            case .tokenNotFound:
                return "No valid token found. Please sign in again."
            case .tokenExchangeFailed(let details):
                return "Token exchange failed: \(details)"
            }
        }
    }

    @Published private(set) var currentUser: UserContext?
    @Published private(set) var isAuthenticated = false
    @Published var isBusy = false
    @Published var errorMessage: String?

    private let configurationService: ConfigurationService
    private let keychain: KeychainStorage
    private let apiClient: APIClient
    private let keychainKey = "magalcom.crm.auth.session"
    private var session: ASWebAuthenticationSession?
    private var tokens: AuthTokens?

    init(configurationService: ConfigurationService = .shared, keychain: KeychainStorage = KeychainStorage(), apiClient: APIClient = .shared) {
        self.configurationService = configurationService
        self.keychain = keychain
        self.apiClient = apiClient
    }

    func restoreSession() async {
        errorMessage = nil
        do {
            do {
                tokens = try keychain.load(AuthTokens.self, forKey: keychainKey)
            } catch {
                try? keychain.delete(forKey: keychainKey)
                tokens = nil
            }
            guard var currentTokens = tokens else {
                return
            }

            if currentTokens.isSessionExpired {
                try? keychain.delete(forKey: keychainKey)
                tokens = nil
                return
            }

            let configuration = try await configurationService.resolveAuthConfiguration()

            if currentTokens.isExpired {
                if let refreshToken = currentTokens.refreshToken {
                    currentTokens = try await refreshTokens(refreshToken, configuration: configuration, preserving: currentTokens)
                    try? keychain.save(currentTokens, forKey: keychainKey)
                    tokens = currentTokens
                } else {
                    try keychain.delete(forKey: keychainKey)
                    return
                }
            }

            let user = try await apiClient.fetchCurrentUser(accessToken: currentTokens.accessToken)
            currentUser = user
            isAuthenticated = true
            tokens = currentTokens
        } catch {
            clearSession()
            if let authError = error as? AuthError {
                errorMessage = authError.localizedDescription
            } else if let error = error as? ConfigurationError {
                errorMessage = error.localizedDescription
            } else {
                errorMessage = "Unable to restore session: \(error.localizedDescription)"
            }
        }
    }

    func signIn() async {
        errorMessage = nil
        let configuration: AppConfiguration
        do {
            configuration = try await configurationService.resolveAuthConfiguration()
        } catch {
            clearSession()
            errorMessage = error.localizedDescription
            return
        }

        guard let callbackScheme = configuration.redirectScheme, !callbackScheme.isEmpty else {
            errorMessage = AuthError.configurationMissing.localizedDescription
            return
        }

        isBusy = true
        defer { isBusy = false }

        do {
            let codeVerifier = PKCEGenerator.createCodeVerifier()
            let codeChallenge = PKCEGenerator.createCodeChallenge(from: codeVerifier)
            let expectedState = UUID().uuidString
            let authUrl = try buildAuthorizationURL(
                codeChallenge: codeChallenge,
                state: expectedState,
                configuration: configuration
            )

            let code = try await performInteractiveSignIn(authUrl, expectedState: expectedState, callbackScheme: callbackScheme)
            let exchanged = try await exchangeCodeForTokens(code, verifier: codeVerifier, configuration: configuration)
            tokens = exchanged
            try? keychain.save(exchanged, forKey: keychainKey)

            let user = try await apiClient.fetchCurrentUser(accessToken: exchanged.accessToken)
            currentUser = user
            isAuthenticated = true
        } catch {
            clearSession()
            if let authError = error as? AuthError {
                errorMessage = authError.localizedDescription
            } else if let error = error as? APIError {
                errorMessage = error.localizedDescription
            } else {
                errorMessage = "Sign-in failed: \(error.localizedDescription)"
            }
        }
    }

    func signOut() {
        clearSession()
    }

    func accessToken() async throws -> String {
        let configuration = try await configurationService.resolveAuthConfiguration()
        if let current = tokens {
            if current.isSessionExpired {
                clearSession()
                throw AuthError.tokenNotFound
            }
            if !current.isExpired {
                return current.accessToken
            }
        }

        if let current = tokens, let refreshToken = current.refreshToken {
            let refreshed = try await refreshTokens(refreshToken, configuration: configuration, preserving: current)
            tokens = refreshed
            try? keychain.save(refreshed, forKey: keychainKey)
            return refreshed.accessToken
        }

        if let stored = try? keychain.load(AuthTokens.self, forKey: keychainKey) {
            if stored.isSessionExpired {
                try? keychain.delete(forKey: keychainKey)
                throw AuthError.tokenNotFound
            }

            if !stored.isExpired {
                tokens = stored
                return stored.accessToken
            }

            if let refreshToken = stored.refreshToken {
                let refreshed = try await refreshTokens(refreshToken, configuration: configuration, preserving: stored)
                tokens = refreshed
                try? keychain.save(refreshed, forKey: keychainKey)
                return refreshed.accessToken
            }
        }

        throw AuthError.tokenNotFound
    }

    private func clearSession() {
        tokens = nil
        isAuthenticated = false
        currentUser = nil
        try? keychain.delete(forKey: keychainKey)
    }

    private func buildAuthorizationURL(codeChallenge: String, state: String, configuration: AppConfiguration) throws -> URL {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "login.microsoftonline.com"
        components.path = "/\(configuration.tenantId)/oauth2/v2.0/authorize"

        components.queryItems = [
            URLQueryItem(name: "client_id", value: configuration.clientId),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "response_mode", value: "query"),
            URLQueryItem(name: "redirect_uri", value: configuration.redirectUri),
            URLQueryItem(name: "scope", value: "openid profile offline_access \(configuration.scope)"),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "prompt", value: "select_account")
        ]

        guard let url = components.url else {
            throw AuthError.authorizationURLInvalid
        }
        return url
    }

    private func performInteractiveSignIn(_ authURL: URL, expectedState: String, callbackScheme: String) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            let authSession = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.missingAuthorizationCode)
                    return
                }

                let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
                let values = components?.queryItems?.reduce(into: [:]) { dict, item in
                    dict[item.name] = item.value
                } ?? [:]

                if let errorValue = values["error"] {
                    if let description = values["error_description"] {
                        continuation.resume(throwing: AuthError.authError("\(errorValue) - \(description)"))
                    } else {
                        continuation.resume(throwing: AuthError.authError(errorValue))
                    }
                    return
                }

                if let state = values["state"], state != expectedState {
                    continuation.resume(throwing: AuthError.stateMismatch)
                    return
                }

                guard let code = values["code"], !code.isEmpty else {
                    continuation.resume(throwing: AuthError.missingAuthorizationCode)
                    return
                }

                continuation.resume(returning: code)
            }

            authSession.presentationContextProvider = self
            authSession.prefersEphemeralWebBrowserSession = true
            self.session = authSession
            authSession.start()
        }
    }

    private func exchangeCodeForTokens(_ code: String, verifier: String, configuration: AppConfiguration) async throws -> AuthTokens {
        var request = URLRequest(url: tokenEndpointURL(configuration: configuration))
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let encodedItems = tokenExchangeItems([
            "client_id": configuration.clientId,
            "scope": "openid profile offline_access \(configuration.scope)",
            "code": code,
            "redirect_uri": configuration.redirectUri,
            "grant_type": "authorization_code",
            "code_verifier": verifier
        ])
        request.httpBody = encodedItems.data(using: .utf8)

        let token = try await performTokenRequest(request, scope: configuration.scope)
        return token
    }

    private func refreshTokens(_ refreshToken: String, configuration: AppConfiguration, preserving existingSession: AuthTokens? = nil) async throws -> AuthTokens {
        var request = URLRequest(url: tokenEndpointURL(configuration: configuration))
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let encodedItems = tokenExchangeItems([
            "client_id": configuration.clientId,
            "scope": "openid profile offline_access \(configuration.scope)",
            "grant_type": "refresh_token",
            "refresh_token": refreshToken
        ])
        request.httpBody = encodedItems.data(using: .utf8)

        let refreshed = try await performTokenRequest(request, scope: configuration.scope)
        let mergedRefreshToken = refreshed.refreshToken ?? refreshToken

        if let existingSession {
            return AuthTokens(
                accessToken: refreshed.accessToken,
                refreshToken: mergedRefreshToken,
                issuedAt: existingSession.issuedAt,
                expiresAt: refreshed.expiresAt,
                sessionExpiresAt: existingSession.sessionExpiresAt,
                scope: refreshed.scope
            )
        }

        return AuthTokens(
            accessToken: refreshed.accessToken,
            refreshToken: mergedRefreshToken,
            issuedAt: refreshed.issuedAt,
            expiresAt: refreshed.expiresAt,
            sessionExpiresAt: refreshed.sessionExpiresAt,
            scope: refreshed.scope
        )
    }

    private func tokenExchangeItems(_ values: [String: String]) -> String {
        values
            .map { key, value in
                let escapedKey = key.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? key
                let escapedValue = value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
                return "\(escapedKey)=\(escapedValue)"
            }
            .joined(separator: "&")
    }

    private func performTokenRequest(_ request: URLRequest, scope: String) async throws -> AuthTokens {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw AuthError.tokenExchangeFailed("No HTTP response.")
            }
            guard (200...299).contains(http.statusCode) else {
                if let payload = String(data: data, encoding: .utf8) {
                    throw AuthError.tokenExchangeFailed("HTTP \(http.statusCode): \(payload)")
                }
                throw AuthError.tokenExchangeFailed("HTTP \(http.statusCode)")
            }

            let decoder = JSONDecoder()
            let tokenResponse = try decoder.decode(TokenExchangeResponse.self, from: data)
            let accessToken = tokenResponse.accessToken
            let refreshToken = tokenResponse.refreshToken
            let expiresIn = tokenResponse.expiresIn
            return AuthTokens(accessToken: accessToken, refreshToken: refreshToken, expiresIn: expiresIn, scope: scope)
        } catch {
            if let authError = error as? AuthError {
                throw authError
            }
            if let decoding = error as? DecodingError {
                throw AuthError.tokenExchangeFailed("Could not parse token response: \(decoding.localizedDescription)")
            }
            throw AuthError.tokenExchangeFailed(error.localizedDescription)
        }
    }

    private func tokenEndpointURL(configuration: AppConfiguration) -> URL {
        var components = URLComponents()
        components.scheme = "https"
        components.host = "login.microsoftonline.com"
        components.path = "/\(configuration.tenantId)/oauth2/v2.0/token"
        return components.url ?? URL(string: "https://login.microsoftonline.com/common/oauth2/v2.0/token")!
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
           let window = scene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return UIWindow()
    }
}

private struct TokenExchangeResponse: Decodable {
    let accessToken: String
    let refreshToken: String?
    let tokenType: String?
    let expiresIn: Int?
    let scope: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case scope
    }
}
