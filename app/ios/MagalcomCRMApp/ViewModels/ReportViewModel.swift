import Foundation

@MainActor
final class ReportViewModel: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var report: SalesMonthlyReportDto?
    @Published var errorMessage: String?
    @Published var sharePayload: SharePayload?
    @Published var fromDate: Date
    @Published var toDate: Date

    private let authService: AuthService
    private let apiClient: APIClient
    private let configurationService: ConfigurationService

    init(authService: AuthService, apiClient: APIClient = .shared, configurationService: ConfigurationService = .shared) {
        let today = Date()
        self.authService = authService
        self.apiClient = apiClient
        self.configurationService = configurationService
        self.toDate = today
        self.fromDate = Calendar.current.date(byAdding: .month, value: -1, to: today) ?? today
    }

    var hasCurrentUser: Bool {
        authService.currentUser != nil
    }

    var currentSalesPersonRow: SalesMonthlyReportRowDto? {
        guard let ownerId = authService.currentUser?.subjectId else {
            return nil
        }
        return report?.rows.first(where: { $0.salesPerson.subjectId == ownerId })
    }

    var reportSummary: SalesMonthlyReportTotalsDto? {
        if let row = currentSalesPersonRow {
            return SalesMonthlyReportTotalsDto(
                months: row.months,
                projectedTotal: row.projectedTotal,
                actualTotal: row.actualTotal
            )
        }
        return report?.totals
    }

    func loadReport() async {
        guard !isLoading else {
            return
        }

        guard authService.currentUser != nil else {
            errorMessage = "Sign in required to load report."
            return
        }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let token = try await authService.accessToken()
            var query = buildQuery()
            let runtimeConfiguration = await configurationService.configuration()
            query.locale = runtimeConfiguration.locale
            report = try await apiClient.fetchStatisticsReport(accessToken: token, query: query)
        } catch {
            report = nil
            errorMessage = formatError(error)
        }
    }

    func exportReport() async {
        guard !isLoading else {
            return
        }

        guard authService.currentUser != nil else {
            errorMessage = "Sign in required to export report."
            return
        }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let token = try await authService.accessToken()
            var query = buildQuery()
            let runtimeConfiguration = await configurationService.configuration()
            query.locale = runtimeConfiguration.locale
            let file = try await apiClient.exportStatisticsReport(accessToken: token, query: query)
            let fileURL = try apiClient.writeToTemporaryFile(file, preferredPrefix: "sales-report")
            sharePayload = SharePayload(fileURL: fileURL)
        } catch {
            errorMessage = formatError(error)
        }
    }

    func reset() {
        report = nil
        errorMessage = nil
        sharePayload = nil
    }

    private func buildQuery() -> StatisticsReportQuery {
        let normalizedFromDate = min(fromDate, toDate)
        let normalizedToDate = max(fromDate, toDate)
        return StatisticsReportQuery(
            fromDate: normalizedFromDate,
            toDate: normalizedToDate,
            ownerSubjectId: authService.currentUser?.subjectId ?? "",
            locale: "he"
        )
    }

    private func formatError(_ error: Error) -> String {
        if let authError = error as? AuthService.AuthError {
            return authError.localizedDescription
        }
        if let apiError = error as? APIError {
            return apiError.localizedDescription
        }
        return error.localizedDescription
    }
}
