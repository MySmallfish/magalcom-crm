import SwiftUI

@main
struct MagalcomCRMApp: App {
    @StateObject private var authService = AuthService()

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(authService)
        }
    }
}

struct AppRootView: View {
    @EnvironmentObject private var authService: AuthService
    @State private var bootstrapping = true
    @State private var localeIdentifier = "he"
    @State private var layoutDirection: LayoutDirection = .rightToLeft
    private let configurationService = ConfigurationService.shared

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            Group {
                if bootstrapping {
                    VStack(spacing: 8) {
                        ProgressView()
                        Text("Preparing sales companion...")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if authService.isAuthenticated {
                    MainTabView(authService: authService)
                        .environmentObject(authService)
                } else {
                    LoginView()
                        .environmentObject(authService)
                }
            }
        }
        .environment(\.locale, Locale(identifier: localeIdentifier))
        .environment(\.layoutDirection, layoutDirection)
        .task {
            if bootstrapping {
                let initialConfiguration = await configurationService.configuration()
                applyLocalization(from: initialConfiguration)
                if let runtimeConfiguration = try? await configurationService.resolveRuntimeConfiguration() {
                    applyLocalization(from: runtimeConfiguration)
                }
                await authService.restoreSession()
                bootstrapping = false
            }
        }
    }

    private func applyLocalization(from configuration: AppConfiguration) {
        localeIdentifier = configuration.locale
        layoutDirection = configuration.isRightToLeft ? .rightToLeft : .leftToRight
    }
}
