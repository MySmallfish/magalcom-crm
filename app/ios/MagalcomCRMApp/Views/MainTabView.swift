import SwiftUI

enum MainTabSelection: Hashable {
    case home
    case leads
    case reports
}

struct MainTabView: View {
    @ObservedObject var authService: AuthService
    @State private var selectedTab: MainTabSelection = .home
    @State private var showingAddLead = false

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView(
                    authService: authService,
                    onAddLead: {
                        selectedTab = .leads
                        showingAddLead = true
                    }
                )
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(MainTabSelection.home)

            NavigationStack {
                LeadsView(authService: authService, showingAddLead: $showingAddLead)
            }
            .tabItem {
                Label("Leads", systemImage: "list.bullet.clipboard")
            }
            .tag(MainTabSelection.leads)

            NavigationStack {
                ReportView(
                    authService: authService,
                    onAddLead: {
                        selectedTab = .leads
                        showingAddLead = true
                    }
                )
            }
            .tabItem {
                Label("Reports", systemImage: "chart.bar.doc.horizontal")
            }
            .tag(MainTabSelection.reports)
        }
        .tint(AppTheme.brandPrimary)
    }
}
