import SwiftUI

struct ReportView: View {
    @ObservedObject var authService: AuthService
    let onAddLead: () -> Void
    @StateObject private var viewModel: ReportViewModel
    @State private var dateRangeExpanded = true

    init(authService: AuthService, onAddLead: @escaping () -> Void) {
        _viewModel = StateObject(wrappedValue: ReportViewModel(authService: authService))
        self.onAddLead = onAddLead
        self.authService = authService
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.vertical, 4)
                }

                detailsCard

                if let report = viewModel.report {
                    monthlySection(for: report)
                } else if !viewModel.isLoading {
                    Text("Run the report to load your sales summary.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
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
        .navigationTitle("My Report")
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
                            await viewModel.loadReport()
                        }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)

                    Button {
                        Task {
                            await viewModel.exportReport()
                        }
                    } label: {
                        Label("Export", systemImage: "square.and.arrow.down")
                    }
                    .disabled(!viewModel.hasCurrentUser || viewModel.isLoading)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task {
            if authService.currentUser != nil {
                await viewModel.loadReport()
            }
        }
        .sheet(item: $viewModel.sharePayload) { payload in
            ShareSheet(items: [payload.fileURL])
        }
    }

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            DisclosureGroup("Date range", isExpanded: $dateRangeExpanded) {
                VStack(alignment: .leading, spacing: 10) {
                    DatePicker("From", selection: $viewModel.fromDate, displayedComponents: .date)
                    DatePicker("To", selection: $viewModel.toDate, in: viewModel.fromDate...Date(), displayedComponents: .date)

                    HStack {
                        Button("Run report") {
                            Task {
                                await viewModel.loadReport()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(!viewModel.hasCurrentUser || viewModel.isLoading)

                        Button("Export report") {
                            Task {
                                await viewModel.exportReport()
                            }
                        }
                        .buttonStyle(.bordered)
                        .disabled(!viewModel.hasCurrentUser || viewModel.isLoading)
                    }
                }
            }
            .padding(14)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if let summary = viewModel.reportSummary {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Totals")
                        .font(.headline)
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Projected")
                            Text(formatCurrency(summary.projectedTotal))
                                .fontWeight(.semibold)
                        }
                        Spacer()
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Actual")
                            Text(formatCurrency(summary.actualTotal))
                                .fontWeight(.semibold)
                        }
                    }
                    .font(.subheadline)
                }
                .padding(14)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func monthlySection(for report: SalesMonthlyReportDto) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Monthly performance")
                .font(.headline)

            let monthRows = report.months.sorted { $0.monthStart < $1.monthStart }

            ForEach(monthRows, id: \.monthStart) { month in
                let values = reportSummary(for: month.monthStart, in: viewModel.currentSalesPersonRow ?? SalesMonthlyReportRowDto(salesPerson: LeadOwner(subjectId: "", displayName: "", email: ""), months: [], projectedTotal: 0, actualTotal: 0))
                HStack {
                    Text(shortMonthLabel(month.monthStart))
                    Spacer()
                    Text("Projected: \(formatCurrency(values.projectedAmount))")
                    Text("Actual: \(formatCurrency(values.actualAmount))")
                        .foregroundStyle(.secondary)
                }
                .font(.caption)
                .padding(10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private func reportSummary(for monthStart: String, in row: SalesMonthlyReportRowDto) -> SalesMonthlyReportMonthValueDto {
        row.months.first(where: { $0.monthStart == monthStart }) ?? SalesMonthlyReportMonthValueDto(monthStart: monthStart, projectedAmount: 0, actualAmount: 0)
    }

    private func shortMonthLabel(_ monthStart: String) -> String {
        guard let date = monthFormatter.date(from: monthStart) else {
            return monthStart
        }
        return monthLabelFormatter.string(from: date)
    }

    private var monthFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }

    private var monthLabelFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale.current
        formatter.dateFormat = "MMM yyyy"
        return formatter
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
    }
}
