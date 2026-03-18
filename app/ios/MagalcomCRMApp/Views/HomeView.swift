import Charts
import SwiftUI

struct HomeView: View {
    @ObservedObject var authService: AuthService
    let onAddLead: () -> Void
    @StateObject private var viewModel: HomeViewModel

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
            Text(viewModel.pieTitle)
                .font(.headline)

            if viewModel.pieSlices.isEmpty {
                Text("No data to plot.")
                    .foregroundStyle(.secondary)
            } else {
                if #available(iOS 17.0, *) {
                    Chart(viewModel.pieSlices) { slice in
                        SectorMark(
                            angle: .value("Amount", slice.value),
                            innerRadius: .ratio(0.55),
                            angularInset: 2
                        )
                        .foregroundStyle(by: .value("Segment", slice.label))
                    }
                    .chartLegend(position: .bottom, alignment: .leading)
                    .frame(height: 300)
                } else {
                    Chart(viewModel.pieSlices) { slice in
                        BarMark(
                            x: .value("Segment", slice.label),
                            y: .value("Amount", slice.value)
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
            Text("Forecast by Quarter (\(thisYear)-\(thisYear + 1))")
                .font(.headline)

            Chart(viewModel.quarterBars) { bucket in
                BarMark(
                    x: .value("Quarter", bucket.label),
                    y: .value("Amount", bucket.value)
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
