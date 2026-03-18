import Foundation

protocol TokenProvider {
    func accessToken() async throws -> String
}

struct AuthTokens: Codable {
    static let maxSessionLifetime: TimeInterval = 14 * 24 * 60 * 60

    let accessToken: String
    let refreshToken: String?
    let issuedAt: Date
    let expiresAt: Date
    let sessionExpiresAt: Date
    let scope: String

    var isExpired: Bool {
        expiresAt <= Date().addingTimeInterval(-30)
    }

    var isSessionExpired: Bool {
        sessionExpiresAt <= Date()
    }

    init(accessToken: String, refreshToken: String?, expiresIn: Int?, scope: String) {
        let now = Date()
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        let ttl = max(expiresIn ?? 900, 60)
        self.issuedAt = now
        self.expiresAt = now.addingTimeInterval(TimeInterval(ttl))
        self.sessionExpiresAt = now.addingTimeInterval(Self.maxSessionLifetime)
        self.scope = scope
    }

    init(
        accessToken: String,
        refreshToken: String?,
        issuedAt: Date,
        expiresAt: Date,
        sessionExpiresAt: Date,
        scope: String
    ) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.issuedAt = issuedAt
        self.expiresAt = expiresAt
        self.sessionExpiresAt = sessionExpiresAt
        self.scope = scope
    }

    enum CodingKeys: String, CodingKey {
        case accessToken
        case refreshToken
        case issuedAt
        case expiresAt
        case sessionExpiresAt
        case scope
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let now = Date()

        accessToken = try container.decode(String.self, forKey: .accessToken)
        refreshToken = try container.decodeIfPresent(String.self, forKey: .refreshToken)
        scope = try container.decodeIfPresent(String.self, forKey: .scope) ?? ""
        expiresAt = try container.decodeIfPresent(Date.self, forKey: .expiresAt)
            ?? now.addingTimeInterval(900)
        issuedAt = try container.decodeIfPresent(Date.self, forKey: .issuedAt)
            ?? now
        sessionExpiresAt = try container.decodeIfPresent(Date.self, forKey: .sessionExpiresAt)
            ?? issuedAt.addingTimeInterval(Self.maxSessionLifetime)
    }
}

struct UserContext: Codable {
    let subjectId: String
    let displayName: String
    let email: String
    let roles: [String]
    let photoUrl: String?
}

struct LeadOwner: Codable, Identifiable {
    let subjectId: String
    let displayName: String
    let email: String

    var id: String { subjectId }
}

struct LeadCustomer: Codable, Identifiable {
    let id: String
    let name: String
    let externalId: String
}

struct LeadProject: Codable, Identifiable {
    let id: String
    let customerId: String
    let name: String
    let isActive: Bool
}

struct WorkTypeDto: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let sortOrder: Int
    let isActive: Bool
}

struct QualificationQuestionDefinitionDto: Codable, Identifiable {
    let code: String
    let label: String
    let weight: Int
    let isOverrideRule: Bool
    let sortOrder: Int

    var id: String { code }
}

struct StageCoefficientDto: Codable, Identifiable {
    let stage: String
    let value: Double

    var id: String { stage }
}

enum LeadStageValue: String, CaseIterable, Codable, Identifiable {
    case before = "Before"
    case auctionKnown = "AuctionKnown"
    case sent = "Sent"
    case auctionActive = "AuctionActive"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .before:
            return NSLocalizedString("Before", comment: "Lead stage")
        case .auctionKnown:
            return NSLocalizedString("Auction Known", comment: "Lead stage")
        case .sent:
            return NSLocalizedString("Sent", comment: "Lead stage")
        case .auctionActive:
            return NSLocalizedString("Auction Active", comment: "Lead stage")
        }
    }
}

enum LeadOfferStatusValue: String, CaseIterable, Codable, Identifiable {
    case open = "Open"
    case win = "Win"
    case lose = "Lose"
    case suspended = "Suspended"
    case cancelled = "Cancelled"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .open:
            return NSLocalizedString("Open", comment: "Offer status")
        case .win:
            return NSLocalizedString("Win", comment: "Offer status")
        case .lose:
            return NSLocalizedString("Lose", comment: "Offer status")
        case .suspended:
            return NSLocalizedString("Suspended", comment: "Offer status")
        case .cancelled:
            return NSLocalizedString("Cancelled", comment: "Offer status")
        }
    }
}

struct LeadWorkTypeTotals: Codable {
    let workTypeId: String
    let workTypeCode: String
    let workTypeName: String
    let amount: Double
}

struct LeadMetrics: Codable {
    let totalAmount: Double
    let qualificationScore: Double
    let qualificationContribution: Double
    let stageContribution: Double
    let chanceToWin: Double
    let forecastAmount: Double
    let highConfidenceForecastAmount: Double
    let wonAmount: Double
}

struct LeadQualificationAnswerDto: Codable, Identifiable {
    let questionCode: String
    let answer: Bool?

    var id: String { questionCode }
}

struct LeadAmountLineDto: Codable, Identifiable {
    let id: String
    let workTypeId: String
    let workTypeCode: String
    let workTypeName: String
    let amount: Double
    let note: String
}

struct LeadAuditEntryDto: Codable, Identifiable {
    let changedAtUtc: String
    let changedBy: String
    let action: String
    let summary: String

    var id: String { "\(changedAtUtc)-\(action)-\(summary)" }
}

struct LeadDto: Codable, Identifiable {
    let id: String
    let owner: LeadOwner
    let customer: LeadCustomer
    let project: LeadProject
    let comments: String
    let qualificationAnswers: [LeadQualificationAnswerDto]
    let stage: String?
    let offerStatus: String
    let isPerpetual: Bool?
    let dueDate: String?
    let actualAwardedAmount: Double?
    let amountLines: [LeadAmountLineDto]
    let metrics: LeadMetrics?
    let isIncomplete: Bool
    let missingFields: [String]
    let amountTotalsByWorkType: [LeadWorkTypeTotals]
    let auditTrail: [LeadAuditEntryDto]
    let createdAtUtc: String
    let updatedAtUtc: String

    var stageValue: LeadStageValue? {
        guard let stage else { return nil }
        return LeadStageValue(rawValue: stage)
    }

    var offerStatusValue: LeadOfferStatusValue {
        LeadOfferStatusValue(rawValue: offerStatus) ?? .open
    }
}

struct LeadModuleMetadataDto: Codable {
    let customers: [LeadCustomer]
    let projects: [LeadProject]
    let workTypes: [WorkTypeDto]
    let qualificationQuestions: [QualificationQuestionDefinitionDto]
    let stageCoefficients: [StageCoefficientDto]
}

struct LeadQualificationAnswerRequestBody: Encodable {
    let questionCode: String
    let answer: Bool?
}

struct LeadAmountLineRequestBody: Encodable {
    let id: String?
    let workTypeId: String
    let amount: Double
    let note: String
}

struct CreateLeadRequestBody: Encodable {
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

struct UpdateLeadRequestBody: Encodable {
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

struct LeadsQuery {
    var search = ""
    var ownerSubjectId = ""
    var customerId = ""
    var workTypeId = ""
    var contractType = ""
    var stage = ""
    var offerStatus = ""
    var dueDateFrom: Date?
    var dueDateTo: Date?
    var amountMin = ""
    var amountMax = ""
    var sortBy = "updatedAt"
    var locale = "he"

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        func add(_ name: String, _ value: String?) {
            guard let raw = value?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else {
                return
            }
            items.append(URLQueryItem(name: name, value: raw))
        }

        add("search", search)
        add("ownerSubjectId", ownerSubjectId)
        add("customerId", customerId)
        add("workTypeId", workTypeId)
        add("contractType", contractType)
        add("stage", stage)
        add("offerStatus", offerStatus)
        add("dueDateFrom", dueDateFrom?.yyyyMmDdString)
        add("dueDateTo", dueDateTo?.yyyyMmDdString)
        add("amountMin", amountMin)
        add("amountMax", amountMax)
        add("sortBy", sortBy)
        add("locale", locale)

        return items
    }
}

struct SalesMonthlyReportMonthDto: Codable {
    let monthStart: String
}

struct SalesMonthlyReportMonthValueDto: Codable {
    let monthStart: String
    let projectedAmount: Double
    let actualAmount: Double
}

struct SalesMonthlyReportRowDto: Codable, Identifiable {
    let salesPerson: LeadOwner
    let months: [SalesMonthlyReportMonthValueDto]
    let projectedTotal: Double
    let actualTotal: Double

    var id: String { salesPerson.subjectId }
}

struct SalesMonthlyReportTotalsDto: Codable {
    let months: [SalesMonthlyReportMonthValueDto]
    let projectedTotal: Double
    let actualTotal: Double
}

struct SalesMonthlyReportDto: Codable {
    let availableSalesPeople: [LeadOwner]
    let months: [SalesMonthlyReportMonthDto]
    let rows: [SalesMonthlyReportRowDto]
    let totals: SalesMonthlyReportTotalsDto
}

struct StatisticsReportQuery {
    var fromDate: Date = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    var toDate: Date = Date()
    var ownerSubjectId: String = ""
    var locale = "he"

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        items.append(URLQueryItem(name: "fromDate", value: fromDate.yyyyMmDdString))
        items.append(URLQueryItem(name: "toDate", value: toDate.yyyyMmDdString))
        if !ownerSubjectId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            items.append(URLQueryItem(name: "ownerSubjectId", value: ownerSubjectId))
        }
        items.append(URLQueryItem(name: "locale", value: locale))
        return items
    }
}

struct DownloadedFile {
    let data: Data
    let suggestedFileName: String?
}

struct SharePayload: Identifiable {
    let id = UUID()
    let fileURL: URL
}

extension Date {
    var yyyyMmDdString: String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: self)
    }
}
