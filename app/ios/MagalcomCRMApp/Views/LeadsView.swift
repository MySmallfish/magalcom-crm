import SwiftUI

private func localized(_ key: String, locale: Locale) -> String {
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

struct LeadsView: View {
    @ObservedObject var authService: AuthService
    @Environment(\.locale) private var locale
    @StateObject private var viewModel: LeadsViewModel
    @Binding private var showingAddLead: Bool
    @State private var editingLead: LeadDto?

    init(authService: AuthService, showingAddLead: Binding<Bool>) {
        _viewModel = StateObject(wrappedValue: LeadsViewModel(authService: authService))
        _showingAddLead = showingAddLead
        self.authService = authService
    }

    var body: some View {
        List {
            if let message = viewModel.errorMessage {
                Text(message)
                    .foregroundStyle(.red)
                    .font(.footnote)
                    .padding(.vertical, 6)
            }

            if !viewModel.hasCurrentUser {
                Text(NSLocalizedString("Sign in to view your leads.", comment: "Leads empty signed-out message"))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else if viewModel.displayedLeads.isEmpty && !viewModel.isLoading {
                Text(NSLocalizedString("No leads to show for your account.", comment: "Leads empty message"))
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 12)
            } else {
                ForEach(viewModel.displayedLeads) { lead in
                    Button {
                        editingLead = lead
                    } label: {
                        LeadRow(lead: lead)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(localized("My Leads", locale: locale))
        .searchable(text: $viewModel.searchText, placement: .automatic, prompt: localized("Customer, project, comments", locale: locale))
        .onSubmit(of: .search) {
            Task {
                await viewModel.loadLeads()
            }
        }
        .task {
            await viewModel.loadLeads()
        }
        .refreshable {
            await viewModel.loadLeads()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                if let current = authService.currentUser {
                    UserIdentityMenu(user: current) {
                        authService.signOut()
                        viewModel.reset()
                        showingAddLead = false
                    }
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingAddLead = true
                } label: {
                    Image(systemName: "plus")
                        .foregroundStyle(AppTheme.brandPrimary)
                }
                .disabled(!viewModel.hasCurrentUser)
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        Task {
                            await viewModel.loadLeads()
                        }
                    } label: {
                        Label(localized("Refresh", locale: locale), systemImage: "arrow.clockwise")
                    }
                    .disabled(viewModel.isLoading)

                    Button {
                        Task {
                            await viewModel.exportLeads()
                        }
                    } label: {
                        Label(localized("Export", locale: locale), systemImage: "square.and.arrow.down")
                    }
                    .disabled(!viewModel.hasCurrentUser || viewModel.isLoading)
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(item: $viewModel.sharePayload) { payload in
            ShareSheet(items: [payload.fileURL])
        }
        .sheet(isPresented: $showingAddLead) {
            LeadEditorSheet(viewModel: viewModel, mode: .create)
        }
        .sheet(item: $editingLead) { lead in
            LeadEditorSheet(viewModel: viewModel, mode: .edit(lead))
        }
    }
}

private struct LeadRow: View {
    let lead: LeadDto
    @Environment(\.locale) private var locale

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading) {
                    Text(lead.customer.name)
                        .font(.headline)
                    Text(lead.project.name)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let metrics = lead.metrics {
                    Text(formatCurrency(metrics.forecastAmount))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
            }

            if let dueDate = lead.dueDate {
                Text(String(format: localized("Due: %@", locale: locale), dueDate))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            let stageTitle = localized(lead.stageValue?.title ?? "Not set", locale: locale)
            let statusTitle = localized(lead.offerStatusValue.title, locale: locale)
            HStack(spacing: 12) {
                Text(String(format: localized("Stage: %@", locale: locale), stageTitle))
                Text(String(format: localized("Status: %@", locale: locale), statusTitle))
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if !lead.comments.isEmpty {
                Text(lead.comments)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 6)
    }

    private func formatCurrency(_ value: Double) -> String {
        CurrencyFormatter.shared(value)
    }
}

private enum CurrencyFormatter {
    static let shared: (Double) -> String = { value in
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
    }
}

private enum LeadEditorMode {
    case create
    case edit(LeadDto)

    var lead: LeadDto? {
        switch self {
        case .create:
            return nil
        case .edit(let lead):
            return lead
        }
    }

    var title: String {
        switch self {
        case .create:
            return "Add Lead"
        case .edit:
            return "Edit Lead"
        }
    }

    var commitButtonTitle: String {
        switch self {
        case .create:
            return "Create"
        case .edit:
            return "Save"
        }
    }
}

private enum BinaryChoice: CaseIterable, Identifiable {
    case yes
    case no

    var id: String {
        switch self {
        case .yes:
            return "yes"
        case .no:
            return "no"
        }
    }

    var title: String {
        switch self {
        case .yes:
            return "Yes"
        case .no:
            return "No"
        }
    }

    var value: Bool {
        switch self {
        case .yes:
            return true
        case .no:
            return false
        }
    }

    init(value: Bool) {
        self = value ? .yes : .no
    }

    init(answer: Bool?) {
        switch answer {
        case true:
            self = .yes
        default:
            self = .no
        }
    }
}

private struct EditableAmountLine: Identifiable {
    let id = UUID()
    let sourceId: String?
    var workTypeId: String
    var amountText: String
    var note: String
}

private struct LeadEditorSheet: View {
    @ObservedObject var viewModel: LeadsViewModel
    let mode: LeadEditorMode
    @Environment(\.dismiss) private var dismiss
    @Environment(\.locale) private var locale
    @Environment(\.layoutDirection) private var layoutDirection

    @State private var selectedCustomerId = ""
    @State private var customerSearchText = ""
    @State private var selectedProjectId = ""
    @State private var createNewProject = false
    @State private var newProjectName = ""
    @State private var comments = ""
    @State private var selectedStageRaw = LeadStageValue.before.rawValue
    @State private var selectedOfferStatus: LeadOfferStatusValue = .open
    @State private var selectedPerpetual: BinaryChoice = .no
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var actualAwardedAmountText = ""
    @State private var qualificationChoices: [String: BinaryChoice] = [:]
    @State private var amountLines: [EditableAmountLine] = []
    @State private var localErrorMessage: String?

    init(viewModel: LeadsViewModel, mode: LeadEditorMode) {
        self.viewModel = viewModel
        self.mode = mode

        let lead = mode.lead
        _selectedCustomerId = State(initialValue: lead?.customer.id ?? "")
        _customerSearchText = State(initialValue: lead?.customer.name ?? "")
        _selectedProjectId = State(initialValue: lead?.project.id ?? "")
        _createNewProject = State(initialValue: false)
        _newProjectName = State(initialValue: "")
        _comments = State(initialValue: lead?.comments ?? "")
        _selectedStageRaw = State(initialValue: (lead?.stageValue ?? .before).rawValue)
        _selectedOfferStatus = State(initialValue: lead?.offerStatusValue ?? .open)
        _selectedPerpetual = State(initialValue: BinaryChoice(value: lead?.isPerpetual ?? false))
        _hasDueDate = State(initialValue: lead?.dueDate != nil)
        _dueDate = State(initialValue: LeadEditorSheet.parseDate(lead?.dueDate) ?? Date())
        _actualAwardedAmountText = State(initialValue: LeadEditorSheet.formatAmount(lead?.actualAwardedAmount))
        _qualificationChoices = State(initialValue: Dictionary(uniqueKeysWithValues: (lead?.qualificationAnswers ?? []).map { ($0.questionCode, BinaryChoice(answer: $0.answer)) }))
        _amountLines = State(initialValue: (lead?.amountLines ?? []).map {
            EditableAmountLine(
                sourceId: $0.id,
                workTypeId: $0.workTypeId,
                amountText: LeadEditorSheet.formatAmount($0.amount),
                note: $0.note
            )
        })
    }

    private var filteredProjects: [LeadProject] {
        viewModel.leadProjects
            .filter { $0.customerId == selectedCustomerId && $0.isActive }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private var selectedCustomer: LeadCustomer? {
        viewModel.leadCustomers.first(where: { $0.id == selectedCustomerId })
    }

    private var customerSuggestions: [LeadCustomer] {
        let normalized = customerSearchText.trimmingCharacters(in: .whitespacesAndNewlines)
        let source = viewModel.leadCustomers.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        if normalized.isEmpty {
            return Array(source.prefix(8))
        }
        return source.filter { $0.name.localizedCaseInsensitiveContains(normalized) }
    }

    private var selectedStage: LeadStageValue {
        LeadStageValue(rawValue: selectedStageRaw) ?? .before
    }

    private var shouldShowQualification: Bool {
        selectedStage != .before
    }

    private var stageAllowsDueDate: Bool {
        selectedStage != .before
    }

    private var stageRequiresDueDate: Bool {
        selectedStage == .sent || selectedStage == .auctionActive
    }

    private var canSubmit: Bool {
        if selectedCustomerId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return false
        }
        if createNewProject {
            return !newProjectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        if selectedProjectId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return false
        }
        if stageRequiresDueDate && !hasDueDate {
            return false
        }
        return !hasAmountLineValidationErrors
    }

    private var hasAmountLineValidationErrors: Bool {
        for line in amountLines {
            let hasInput = !(line.workTypeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && line.amountText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && line.note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            if !hasInput {
                continue
            }
            if line.workTypeId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                return true
            }
            guard let amount = LeadEditorSheet.parseDouble(line.amountText), amount >= 0 else {
                return true
            }
        }
        return false
    }

    private var stageCoefficientsByStage: [String: Double] {
        Dictionary(uniqueKeysWithValues: viewModel.stageCoefficients.map { ($0.stage, $0.value) })
    }

    private var visibleError: String? {
        localErrorMessage ?? viewModel.addLeadErrorMessage
    }

    private var sectionAlignment: HorizontalAlignment {
        .leading
    }

    private var textAlignment: TextAlignment {
        .leading
    }

    private var rowAlignment: Alignment {
        .leading
    }

    private var qualificationOptions: [BinaryChoice] {
        [.yes, .no]
    }

    private var amountTextAlignment: TextAlignment {
        .leading
    }

    private var amountRowAlignment: Alignment {
        .leading
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(localized("Customer and Project", locale: locale)) {
                    TextField(localized("Search customer", locale: locale), text: $customerSearchText)
                        .multilineTextAlignment(textAlignment)
                        .onChange(of: customerSearchText) { value in
                            let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
                            if let exact = viewModel.leadCustomers.first(where: { $0.name.caseInsensitiveCompare(normalized) == .orderedSame }) {
                                if selectedCustomerId != exact.id {
                                    selectedCustomerId = exact.id
                                    selectedProjectId = ""
                                }
                                return
                            }
                            if let selectedCustomer,
                               selectedCustomer.name.caseInsensitiveCompare(normalized) != .orderedSame {
                                selectedCustomerId = ""
                                selectedProjectId = ""
                            }
                        }

                    if !customerSuggestions.isEmpty {
                        ForEach(customerSuggestions) { customer in
                            Button {
                                selectedCustomerId = customer.id
                                customerSearchText = customer.name
                                if !filteredProjects.contains(where: { $0.id == selectedProjectId }) {
                                    selectedProjectId = ""
                                }
                            } label: {
                                HStack {
                                    Text(customer.name)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    if selectedCustomerId == customer.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(AppTheme.brandPrimary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    if !selectedCustomerId.isEmpty {
                        Toggle(localized("Create New Project", locale: locale), isOn: $createNewProject)

                        if createNewProject {
                            TextField(localized("Project name", locale: locale), text: $newProjectName)
                                .multilineTextAlignment(textAlignment)
                        } else {
                            Picker(localized("Project", locale: locale), selection: $selectedProjectId) {
                                Text(localized("Select project", locale: locale)).tag("")
                                ForEach(filteredProjects) { project in
                                    Text(project.name).tag(project.id)
                                }
                            }

                            if filteredProjects.isEmpty {
                                Text(localized("No active projects for this customer. Enable 'Create New Project'.", locale: locale))
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(textAlignment)
                            }
                        }
                    }
                }

                Section(localized("Status and Levels", locale: locale)) {
                    Picker(localized("Stage", locale: locale), selection: $selectedStageRaw) {
                        ForEach(LeadStageValue.allCases) { stage in
                            Text(stageLabel(for: stage)).tag(stage.rawValue)
                        }
                    }
                    .onChange(of: selectedStageRaw) { _ in
                        if !stageAllowsDueDate {
                            hasDueDate = false
                        }
                        if stageRequiresDueDate {
                            hasDueDate = true
                        }
                    }

                    Picker(localized("Offer Status", locale: locale), selection: $selectedOfferStatus) {
                        ForEach(LeadOfferStatusValue.allCases) { status in
                            Text(localized(status.title, locale: locale)).tag(status)
                        }
                    }

                    VStack(alignment: sectionAlignment, spacing: 8) {
                        Text(localized("Perpetual", locale: locale))
                            .frame(maxWidth: .infinity, alignment: rowAlignment)
                        Picker(localized("Perpetual", locale: locale), selection: $selectedPerpetual) {
                            ForEach(qualificationOptions) { option in
                                Text(localized(option.title, locale: locale)).tag(option)
                            }
                        }
                        .labelsHidden()
                        .pickerStyle(.segmented)
                        .environment(\.layoutDirection, .leftToRight)
                    }

                    if stageAllowsDueDate {
                        if stageRequiresDueDate {
                            DatePicker(localized("Due Date", locale: locale), selection: $dueDate, displayedComponents: .date)
                        } else {
                            Toggle(localized("Set due date", locale: locale), isOn: $hasDueDate)
                            if hasDueDate {
                                DatePicker(localized("Due Date", locale: locale), selection: $dueDate, displayedComponents: .date)
                            }
                        }
                    }
                }

                if shouldShowQualification {
                    Section(localized("Qualification", locale: locale)) {
                        if viewModel.leadQualificationQuestions.isEmpty {
                            Text(localized("No qualification questions configured.", locale: locale))
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                    } else {
                        ForEach(viewModel.leadQualificationQuestions) { question in
                            VStack(alignment: sectionAlignment, spacing: 8) {
                                    Text(localized(question.label, locale: locale))
                                        .font(.subheadline)
                                        .frame(maxWidth: .infinity, alignment: rowAlignment)
                                        .multilineTextAlignment(textAlignment)
                                Picker(localized("Answer", locale: locale), selection: qualificationBinding(for: question.code)) {
                                    ForEach(qualificationOptions) { option in
                                        Text(localized(option.title, locale: locale)).tag(option)
                                    }
                                }
                                .pickerStyle(.segmented)
                                .environment(\.layoutDirection, .leftToRight)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                }

                Section(localized("Amount by Type", locale: locale)) {
                    ForEach($amountLines) { $line in
                        VStack(alignment: sectionAlignment, spacing: 8) {
                            Picker(localized("Type", locale: locale), selection: $line.workTypeId) {
                                Text(localized("Select type", locale: locale)).tag("")
                                ForEach(viewModel.leadWorkTypes.filter { $0.isActive || $0.id == line.workTypeId }) { workType in
                                    Text(workType.name).tag(workType.id)
                                }
                            }

                            TextField(localized("Amount", locale: locale), text: $line.amountText)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(amountTextAlignment)
                                .frame(maxWidth: .infinity, alignment: amountRowAlignment)

                            TextField(localized("Note", locale: locale), text: $line.note)
                                .multilineTextAlignment(amountTextAlignment)
                                .frame(maxWidth: .infinity, alignment: amountRowAlignment)

                            Button(localized("Remove line", locale: locale), role: .destructive) {
                                amountLines.removeAll { $0.id == line.id }
                            }
                            .font(.footnote)
                            .frame(maxWidth: .infinity, alignment: rowAlignment)
                        }
                        .padding(.vertical, 4)
                    }

                    Button(localized("Add amount line", locale: locale)) {
                        amountLines.append(
                            EditableAmountLine(
                                sourceId: nil,
                                workTypeId: viewModel.leadWorkTypes.first(where: { $0.isActive })?.id ?? "",
                                amountText: "",
                                note: ""
                            )
                        )
                    }
                    .frame(maxWidth: .infinity, alignment: rowAlignment)

                    TextField(localized("Actual awarded amount", locale: locale), text: $actualAwardedAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(amountTextAlignment)
                        .frame(maxWidth: .infinity, alignment: amountRowAlignment)
                }

                Section(localized("Lead Details", locale: locale)) {
                    TextField(localized("Comments", locale: locale), text: $comments, axis: .vertical)
                        .lineLimit(3...6)
                }

                if let message = visibleError {
                    Section {
                        Text(message)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle(localized(mode.title, locale: locale))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localized("Cancel", locale: locale)) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(localized(mode.commitButtonTitle, locale: locale)) {
                        Task {
                            localErrorMessage = nil
                            viewModel.addLeadErrorMessage = nil
                            guard let payload = buildPayload() else {
                                return
                            }

                            let success: Bool
                            switch mode {
                            case .create:
                                let request = CreateLeadRequestBody(
                                    customerId: payload.customerId,
                                    projectId: payload.projectId,
                                    projectName: payload.projectName,
                                    comments: payload.comments,
                                    qualificationAnswers: payload.qualificationAnswers,
                                    stage: payload.stage,
                                    isPerpetual: payload.isPerpetual,
                                    dueDate: payload.dueDate,
                                    offerStatus: payload.offerStatus,
                                    actualAwardedAmount: payload.actualAwardedAmount,
                                    amountLines: payload.amountLines
                                )
                                success = await viewModel.createLead(request: request)
                            case .edit(let lead):
                                let request = UpdateLeadRequestBody(
                                    customerId: payload.customerId,
                                    projectId: payload.projectId,
                                    projectName: payload.projectName,
                                    comments: payload.comments,
                                    qualificationAnswers: payload.qualificationAnswers,
                                    stage: payload.stage,
                                    isPerpetual: payload.isPerpetual,
                                    dueDate: payload.dueDate,
                                    offerStatus: payload.offerStatus,
                                    actualAwardedAmount: payload.actualAwardedAmount,
                                    amountLines: payload.amountLines
                                )
                                success = await viewModel.updateLead(leadId: lead.id, request: request)
                            }

                            if success {
                                dismiss()
                            }
                        }
                    }
                    .disabled(!canSubmit || viewModel.isSubmittingLead)
                }
            }
            .task {
                if viewModel.leadCustomers.isEmpty {
                    await viewModel.loadLeadMetadata()
                }
                if viewModel.leadCustomers.count == 1 && selectedCustomerId.isEmpty {
                    selectedCustomerId = viewModel.leadCustomers[0].id
                    customerSearchText = viewModel.leadCustomers[0].name
                }
                if customerSearchText.isEmpty, let selectedCustomer {
                    customerSearchText = selectedCustomer.name
                }
                if !createNewProject && filteredProjects.isEmpty {
                    createNewProject = true
                }
                if stageRequiresDueDate {
                    hasDueDate = true
                }
                ensureQualificationChoices()
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }

    private struct LeadFormPayload {
        let customerId: String
        let projectId: String?
        let projectName: String
        let comments: String
        let qualificationAnswers: [LeadQualificationAnswerRequestBody]
        let stage: LeadStageValue?
        let isPerpetual: Bool?
        let dueDate: String?
        let offerStatus: LeadOfferStatusValue
        let actualAwardedAmount: Double?
        let amountLines: [LeadAmountLineRequestBody]
    }

    private func buildPayload() -> LeadFormPayload? {
        let customerId = selectedCustomerId.trimmingCharacters(in: .whitespacesAndNewlines)
        if customerId.isEmpty {
            localErrorMessage = localized("Select a customer.", locale: locale)
            return nil
        }

        let projectId = createNewProject ? nil : selectedProjectId.trimmingCharacters(in: .whitespacesAndNewlines)
        let projectName = createNewProject ? newProjectName.trimmingCharacters(in: .whitespacesAndNewlines) : ""
        if (projectId ?? "").isEmpty && projectName.isEmpty {
            localErrorMessage = localized("Select an existing project or enter a new project name.", locale: locale)
            return nil
        }

        let qualificationOrder = viewModel.leadQualificationQuestions.map(\.code)
        let qualificationCodes = qualificationOrder.isEmpty ? qualificationChoices.keys.sorted() : qualificationOrder
        let qualificationAnswers = qualificationCodes.map { code in
            LeadQualificationAnswerRequestBody(
                questionCode: code,
                answer: qualificationChoices[code, default: .no].value
            )
        }

        let stage = selectedStage
        if stageRequiresDueDate && !hasDueDate {
            localErrorMessage = localized("Due date is required for Sent and Auction Active stages.", locale: locale)
            return nil
        }

        let actualAwardedAmount: Double?
        if actualAwardedAmountText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            actualAwardedAmount = nil
        } else {
            guard let parsed = LeadEditorSheet.parseDouble(actualAwardedAmountText), parsed >= 0 else {
                localErrorMessage = localized("Actual awarded amount must be a non-negative number.", locale: locale)
                return nil
            }
            actualAwardedAmount = parsed
        }

        var normalizedAmountLines: [LeadAmountLineRequestBody] = []
        for line in amountLines {
            let workTypeId = line.workTypeId.trimmingCharacters(in: .whitespacesAndNewlines)
            let amountText = line.amountText.trimmingCharacters(in: .whitespacesAndNewlines)
            let note = line.note.trimmingCharacters(in: .whitespacesAndNewlines)
            let hasInput = !(workTypeId.isEmpty && amountText.isEmpty && note.isEmpty && line.sourceId == nil)
            if !hasInput {
                continue
            }

            if workTypeId.isEmpty {
                localErrorMessage = localized("Each amount line must include a type.", locale: locale)
                return nil
            }

            guard let amount = LeadEditorSheet.parseDouble(amountText), amount >= 0 else {
                localErrorMessage = localized("Each amount line must have a non-negative numeric amount.", locale: locale)
                return nil
            }

            normalizedAmountLines.append(
                LeadAmountLineRequestBody(
                    id: line.sourceId,
                    workTypeId: workTypeId,
                    amount: amount,
                    note: note
                )
            )
        }

        let payload = LeadFormPayload(
            customerId: customerId,
            projectId: (projectId ?? "").isEmpty ? nil : projectId,
            projectName: projectName,
            comments: comments.trimmingCharacters(in: .whitespacesAndNewlines),
            qualificationAnswers: qualificationAnswers,
            stage: stage,
            isPerpetual: selectedPerpetual.value,
            dueDate: (stageAllowsDueDate && hasDueDate) ? LeadEditorSheet.dateFormatter.string(from: dueDate) : nil,
            offerStatus: selectedOfferStatus,
            actualAwardedAmount: actualAwardedAmount,
            amountLines: normalizedAmountLines
        )

        return payload
    }

    private func ensureQualificationChoices() {
        for question in viewModel.leadQualificationQuestions {
            if qualificationChoices[question.code] == nil {
                qualificationChoices[question.code] = .no
            }
        }
    }

    private func qualificationBinding(for questionCode: String) -> Binding<BinaryChoice> {
        Binding {
            qualificationChoices[questionCode, default: .no]
        } set: { newValue in
            qualificationChoices[questionCode] = newValue
        }
    }

    private func stageLabel(for stage: LeadStageValue) -> String {
        let localizedStage = localized(stage.title, locale: locale)
        guard let coefficient = stageCoefficientsByStage[stage.rawValue] else {
            return localizedStage
        }

        let percent = coefficient <= 1 ? coefficient * 100 : coefficient
        return "\(localizedStage) (\(Int(percent.rounded()))%)"
    }

    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static func parseDate(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        return dateFormatter.date(from: raw)
    }

    private static func parseDouble(_ raw: String) -> Double? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return nil
        }
        let normalized = trimmed.replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }

    private static func formatAmount(_ value: Double?) -> String {
        guard let value else { return "" }
        if value == floor(value) {
            return String(Int(value))
        }
        return String(value)
    }
}
