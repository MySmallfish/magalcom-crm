import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authService: AuthService
    private let logoURL = URL(string: "https://magalcom.com/wp-content/uploads/magalcomlogo2026en.png")

    var body: some View {
        VStack(spacing: 22) {
            Spacer()

            if let logoURL {
                AsyncImage(url: logoURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                    case .empty:
                        ProgressView()
                    default:
                        Image(systemName: "briefcase.circle.fill")
                            .resizable()
                            .scaledToFit()
                            .foregroundStyle(AppTheme.brandPrimary)
                    }
                }
                .frame(width: 300, height: 90)
                .padding(.bottom, 8)
            }

            Text("Sign in to see your assigned leads and reporting.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 12)

            if let message = authService.errorMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity)
                    .padding(.horizontal, 12)
            }

            Button {
                Task {
                    await authService.signIn()
                }
            } label: {
                HStack {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                    Text("Sign in to Magalcom")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.brandPrimary)
            .disabled(authService.isBusy)
            .padding(.horizontal, 28)

            if authService.isBusy {
                ProgressView()
            }

            Spacer()
        }
        .padding()
    }
}
