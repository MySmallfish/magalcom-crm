import Foundation

@MainActor
final class LeadsViewModel: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var isLoadingMetadata = false
    @Published private(set) var isSubmittingLead = false
    @Published private(set) var leads: [LeadDto] = []
    @Published private(set) var leadCustomers: [LeadCustomer] = []
    @Published private(set) var leadProjects: [LeadProject] = []
    @Published private(set) var leadWorkTypes: [WorkTypeDto] = []
    @Published private(set) var leadQualificationQuestions: [QualificationQuestionDefinitionDto] = []
    @Published private(set) var stageCoefficients: [StageCoefficientDto] = []
    @Published var searchText = ""
    @Published var errorMessage: String?
    @Published var addLeadErrorMessage: String?
    @Published var sharePayload: SharePayload?

    private let authService: AuthService
    private let apiClient: APIClient
    private let configurationService: ConfigurationService

    init(authService: AuthService, apiClient: APIClient = .shared, configurationService: ConfigurationService = .shared) {
        self.authService = authService
        self.apiClient = apiClient
        self.configurationService = configurationService
    }

    var hasCurrentUser: Bool {
        authService.currentUser != nil
    }

    var isAdmin: Bool {
        authService.currentUser?.roles.contains(where: { $0.caseInsensitiveCompare("Admin") == .orderedSame }) == true
    }

    var displayedLeads: [LeadDto] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else {
            return leads
        }

        let normalized = query.lowercased()
        return leads.filter { lead in
            let haystack = [
                lead.customer.name,
                lead.project.name,
                lead.comments,
                lead.stage ?? "",
                lead.offerStatus,
                lead.dueDate ?? ""
            ]
                .joined(separator: " ")
                .lowercased()
            return haystack.contains(normalized)
        }
    }

    func loadLeads() async {
        guard !isLoading else {
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
            leads = try await apiClient.fetchLeads(accessToken: token, query: query)
        } catch {
            leads = []
            errorMessage = formatError(error)
        }
    }

    func exportLeads() async {
        guard !isLoading else {
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
            let file = try await apiClient.exportLeads(accessToken: token, query: query)
            let fileURL = try apiClient.writeToTemporaryFile(file, preferredPrefix: "leads")
            sharePayload = SharePayload(fileURL: fileURL)
        } catch {
            errorMessage = formatError(error)
        }
    }

    func loadLeadMetadata() async {
        guard !isLoadingMetadata else {
            return
        }

        isLoadingMetadata = true
        addLeadErrorMessage = nil
        defer { isLoadingMetadata = false }

        do {
            let token = try await authService.accessToken()
            let metadata = try await apiClient.fetchLeadMetadata(accessToken: token)
            leadCustomers = metadata.customers.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            leadProjects = metadata.projects.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            leadWorkTypes = metadata.workTypes.sorted { lhs, rhs in
                if lhs.sortOrder == rhs.sortOrder {
                    return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
                }
                return lhs.sortOrder < rhs.sortOrder
            }
            leadQualificationQuestions = metadata.qualificationQuestions.sorted { lhs, rhs in
                if lhs.sortOrder == rhs.sortOrder {
                    return lhs.label.localizedCaseInsensitiveCompare(rhs.label) == .orderedAscending
                }
                return lhs.sortOrder < rhs.sortOrder
            }
            stageCoefficients = metadata.stageCoefficients.sorted {
                $0.stage.localizedCaseInsensitiveCompare($1.stage) == .orderedAscending
            }
        } catch {
            addLeadErrorMessage = formatError(error)
        }
    }

    func createLead(request: CreateLeadRequestBody) async -> Bool {
        guard !isSubmittingLead else {
            return false
        }

        if let validationError = validateLeadRequest(
            customerId: request.customerId,
            projectId: request.projectId,
            projectName: request.projectName,
            actualAwardedAmount: request.actualAwardedAmount,
            amountLines: request.amountLines
        ) {
            addLeadErrorMessage = validationError
            return false
        }

        isSubmittingLead = true
        addLeadErrorMessage = nil
        defer { isSubmittingLead = false }

        do {
            let token = try await authService.accessToken()
            let created = try await apiClient.createLead(accessToken: token, request: request)
            leads.insert(created, at: 0)
            return true
        } catch {
            addLeadErrorMessage = formatError(error)
            return false
        }
    }

    func updateLead(leadId: String, request: UpdateLeadRequestBody) async -> Bool {
        guard !isSubmittingLead else {
            return false
        }

        if let validationError = validateLeadRequest(
            customerId: request.customerId,
            projectId: request.projectId,
            projectName: request.projectName,
            actualAwardedAmount: request.actualAwardedAmount,
            amountLines: request.amountLines
        ) {
            addLeadErrorMessage = validationError
            return false
        }

        isSubmittingLead = true
        addLeadErrorMessage = nil
        defer { isSubmittingLead = false }

        do {
            let token = try await authService.accessToken()
            let updated = try await apiClient.updateLead(accessToken: token, leadId: leadId, request: request)
            if let index = leads.firstIndex(where: { $0.id == leadId }) {
                leads[index] = updated
            } else {
                leads.insert(updated, at: 0)
            }
            return true
        } catch {
            addLeadErrorMessage = formatError(error)
            return false
        }
    }

    func reset() {
        leads = []
        leadCustomers = []
        leadProjects = []
        leadWorkTypes = []
        leadQualificationQuestions = []
        stageCoefficients = []
        errorMessage = nil
        addLeadErrorMessage = nil
        sharePayload = nil
    }

    private func buildQuery() -> LeadsQuery {
        var query = LeadsQuery()
        query.search = ""
        query.ownerSubjectId = isAdmin ? "" : (authService.currentUser?.subjectId ?? "")
        query.sortBy = "updatedAt"
        return query
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

    private func validateLeadRequest(
        customerId: String,
        projectId: String?,
        projectName: String,
        actualAwardedAmount: Double?,
        amountLines: [LeadAmountLineRequestBody]
    ) -> String? {
        if customerId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Select a customer."
        }

        let normalizedProjectId = projectId?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let normalizedProjectName = projectName.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalizedProjectId.isEmpty && normalizedProjectName.isEmpty {
            return "Select an existing project or enter a new project name."
        }

        if let actualAwardedAmount, actualAwardedAmount < 0 {
            return "Actual awarded amount cannot be negative."
        }

        for line in amountLines {
            if line.workTypeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return "Each amount line must include a work type."
            }
            if line.amount < 0 {
                return "Amount line values cannot be negative."
            }
        }

        return nil
    }
}
