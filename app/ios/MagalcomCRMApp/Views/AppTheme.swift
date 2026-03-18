import SwiftUI

enum AppTheme {
    static let brandPrimary = Color(red: 0.09, green: 0.54, blue: 0.94)
}

struct UserIdentityMenu: View {
    let user: UserContext
    let onSignOut: () -> Void

    var body: some View {
        Menu {
            Text(user.displayName)
            Text(user.email)
            if !user.roles.isEmpty {
                Text("Roles: \(user.roles.joined(separator: ", "))")
            }
            Button("Sign out", role: .destructive) {
                onSignOut()
            }
        } label: {
            avatarView
                .frame(width: 36, height: 36)
                .clipShape(Circle())
        }
    }

    @ViewBuilder
    private var avatarView: some View {
        demoAvatar
    }

    private var demoAvatar: some View {
        ZStack {
            Circle()
                .fill(Color(.secondarySystemBackground))
            Image(systemName: "person.crop.circle.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(AppTheme.brandPrimary)
                .padding(4)
        }
    }
}
