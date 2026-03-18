import Charts
import SwiftUI

private func localizedHome(_ key: String, locale: Locale) -> String {
    var candidates: [String] = [locale.identifier]
    let languageCode = locale.identifier
        .components(separatedBy: CharacterSet(charactersIn: "_-"))
        .first ?? locale.identifier
    if !languageCode.isEmpty && languageCode != locale.identifier {
        candidates.append(languageCode)
    }

    for candidate in candidates where !candidate.isEmpty {
        guard let path = Bundle.main.path(forResource: candidate, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            continue
        }
        let localizedValue = bundle.localizedString(forKey: key, value: key, table: nil)
        if localizedValue != key {
            return localizedValue
        }
    }

    return Bundle.main.localizedString(forKey: key, value: key, table: nil)
}

struct HomeView: View {
    @ObservedObject var authService: AuthService
    let onAddLead: () -> Void
    @StateObject private var viewModel: HomeViewModel
    @Environment(\.locale) private var locale

    init(authService: AuthService, onAddLead: @escaping () -> Void) {
        self.authService = authService
        self.onAddLead = onAddLead
        _viewModel = StateObject(wrappedValue: HomeViewModel(authService: authService))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let message = viewModel.errorMessage {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                if viewModel.leads.isEmpty && !viewModel.isLoading {
                    Text("No dashboard data available.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    chartPager
                }

                if viewModel.isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.top, 12)
                }
            }
            .padding()
        }
        .navigationTitle("Home")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                if let current = authService.currentUser {
                    UserIdentityMenu(user: current) {
                        authService.signOut()
                        viewModel.reset()
                    }
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    onAddLead()
                } label: {
                    Image(systemName: "plus")
                        .foregroundStyle(AppTheme.brandPrimary)
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        Task {
                            await viewModel.loadDashboard()
                        }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task {
            if viewModel.hasCurrentUser {
                await viewModel.loadDashboard()
            }
        }
        .refreshable {
            await viewModel.loadDashboard()
        }
    }

    private var chartPager: some View {
        TabView {
            pieCard
            quartersCard
        }
        .frame(height: 390)
        .tabViewStyle(.page(indexDisplayMode: .automatic))
    }

    private var pieCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(localizedHome(viewModel.pieTitle, locale: locale))
                .font(.headline)

            if viewModel.pieSlices.isEmpty {
                Text("No data to plot.")
                    .foregroundStyle(.secondary)
            } else {
                if #available(iOS 17.0, *) {
                    Chart(viewModel.pieSlices) { slice in
                        SectorMark(
                            angle: .value(localizedHome("Amount", locale: locale), slice.value),
                            innerRadius: .ratio(0.55),
                            angularInset: 2
                        )
                        .foregroundStyle(by: .value(localizedHome("Segment", locale: locale), slice.label))
                    }
                    .chartLegend(position: .bottom, alignment: .leading)
                    .frame(height: 300)
                } else {
                    Chart(viewModel.pieSlices) { slice in
                        BarMark(
                            x: .value(localizedHome("Segment", locale: locale), slice.label),
                            y: .value(localizedHome("Amount", locale: locale), slice.value)
                        )
                        .foregroundStyle(AppTheme.brandPrimary)
                    }
                    .frame(height: 300)
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var quartersCard: some View {
        let thisYear = Calendar(identifier: .gregorian).component(.year, from: Date())
        return VStack(alignment: .leading, spacing: 12) {
            Text(String(format: localizedHome("Forecast by Quarter (%d-%d)", locale: locale), thisYear, thisYear + 1))
                .font(.headline)

            Chart(viewModel.quarterBars) { bucket in
                BarMark(
                    x: .value(localizedHome("Quarter", locale: locale), bucket.label),
                    y: .value(localizedHome("Amount", locale: locale), bucket.value)
                )
                .foregroundStyle(bucket.year == thisYear ? AppTheme.brandPrimary : .gray)
            }
            .frame(height: 300)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
