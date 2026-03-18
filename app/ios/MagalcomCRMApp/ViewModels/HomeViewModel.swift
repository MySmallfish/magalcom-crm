import Foundation

struct DashboardSlice: Identifiable {
    let id: String
    let label: String
    let value: Double
}

struct QuarterBucket: Identifiable {
    let id: String
    let label: String
    let year: Int
    let quarter: Int
    let value: Double
}

@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var leads: [LeadDto] = []
    @Published var errorMessage: String?

    private let authService: AuthService
    private let apiClient: APIClient

    init(authService: AuthService, apiClient: APIClient = .shared) {
        self.authService = authService
        self.apiClient = apiClient
    }

    var hasCurrentUser: Bool {
        authService.currentUser != nil
    }

    var isAdmin: Bool {
        authService.currentUser?.roles.contains(where: { $0.caseInsensitiveCompare("Admin") == .orderedSame }) == true
    }

    var pieTitle: String {
        isAdmin
            ? NSLocalizedString("Pipeline by Salesperson", comment: "Dashboard pie title")
            : NSLocalizedString("Pipeline by Domain", comment: "Dashboard pie title")
    }

    var pieSlices: [DashboardSlice] {
        if isAdmin {
            var buckets: [String: Double] = [:]
            for lead in leads {
                let key = lead.owner.displayName
                let amount = lead.metrics?.forecastAmount ?? lead.metrics?.totalAmount ?? 0
                buckets[key, default: 0] += amount
            }
            return buckets
                .map { DashboardSlice(id: $0.key, label: $0.key, value: $0.value) }
                .sorted { $0.value > $1.value }
        }

        var byWorkType: [String: Double] = [:]
        for lead in leads {
            for total in lead.amountTotalsByWorkType {
                byWorkType[total.workTypeName, default: 0] += total.amount
            }
        }

        if !byWorkType.isEmpty {
            return byWorkType
                .map { DashboardSlice(id: $0.key, label: $0.key, value: $0.value) }
                .sorted { $0.value > $1.value }
        }

        var fallback: [String: Double] = [:]
        for lead in leads {
            let amount = lead.metrics?.forecastAmount ?? lead.metrics?.totalAmount ?? 0
            fallback[lead.customer.name, default: 0] += amount
        }
        return fallback
            .map { DashboardSlice(id: $0.key, label: $0.key, value: $0.value) }
            .sorted { $0.value > $1.value }
    }

    var quarterBars: [QuarterBucket] {
        let calendar = Calendar(identifier: .gregorian)
        let thisYear = calendar.component(.year, from: Date())
        let years = [thisYear, thisYear + 1]

        var buckets: [String: Double] = [:]
        for year in years {
            for quarter in 1...4 {
                buckets["\(year)-Q\(quarter)"] = 0
            }
        }

        for lead in leads {
            guard
                let dueDate = parseDate(lead.dueDate),
                years.contains(calendar.component(.year, from: dueDate))
            else {
                continue
            }

            let year = calendar.component(.year, from: dueDate)
            let month = calendar.component(.month, from: dueDate)
            let quarter = ((month - 1) / 3) + 1
            let key = "\(year)-Q\(quarter)"
            let value = lead.metrics?.forecastAmount ?? lead.metrics?.totalAmount ?? 0
            buckets[key, default: 0] += value
        }

        return years.flatMap { year in
            (1...4).map { quarter in
                let key = "\(year)-Q\(quarter)"
                return QuarterBucket(
                    id: key,
                    label: "Q\(quarter) \(year)",
                    year: year,
                    quarter: quarter,
                    value: buckets[key, default: 0]
                )
            }
        }
    }

    func loadDashboard() async {
        guard !isLoading else {
            return
        }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let token = try await authService.accessToken()
            var query = LeadsQuery()
            query.ownerSubjectId = isAdmin ? "" : (authService.currentUser?.subjectId ?? "")
            query.search = ""
            query.sortBy = "updatedAt"
            leads = try await apiClient.fetchLeads(accessToken: token, query: query)
        } catch {
            leads = []
            errorMessage = formatError(error)
        }
    }

    func reset() {
        leads = []
        errorMessage = nil
    }

    private func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
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
