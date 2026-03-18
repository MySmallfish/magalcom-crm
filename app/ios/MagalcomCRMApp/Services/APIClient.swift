import Foundation

enum APIError: Error, LocalizedError {
    case invalidResponse
    case requestFailed(status: Int, message: String)
    case decodingFailed
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid server response."
        case .requestFailed(let status, let message):
            return "Request failed (\(status)): \(message)"
        case .decodingFailed:
            return "Failed to parse API response."
        case .transport(let error):
            return error.localizedDescription
        }
    }
}

final class APIClient {
    static let shared = APIClient()

    private let configurationService: ConfigurationService
    private let decoder: JSONDecoder

    init(configurationService: ConfigurationService = .shared) {
        self.configurationService = configurationService
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder = decoder
    }

    private func buildURL(path: String, query: [URLQueryItem] = []) async throws -> URL {
        let configuration = await configurationService.configuration()
        let normalizedPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        let base = configuration.apiBaseURL.absoluteString.hasSuffix("/") ? configuration.apiBaseURL.absoluteString : configuration.apiBaseURL.absoluteString + "/"
        guard var components = URLComponents(string: base + normalizedPath) else {
            throw APIError.invalidResponse
        }

        let filteredQuery = query.filter { !($0.value ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        if !filteredQuery.isEmpty {
            components.queryItems = filteredQuery
        }

        guard let url = components.url else {
            throw APIError.invalidResponse
        }
        return url
    }

    private func requestData(path: String, method: String = "GET", accessToken: String, query: [URLQueryItem] = [], body: Data? = nil) async throws -> (Data, HTTPURLResponse) {
        let url = try await buildURL(path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            request.httpMethod = method
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            guard (200...299).contains(http.statusCode) else {
                if let payload = parseErrorPayload(data) {
                    throw APIError.requestFailed(status: http.statusCode, message: payload)
                }
                throw APIError.requestFailed(status: http.statusCode, message: "Server error")
            }

            return (data, http)
        } catch {
            if let apiError = error as? APIError {
                throw apiError
            }
            throw APIError.transport(error)
        }
    }

    private func parseErrorPayload(_ data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return (object["error"] as? String) ?? (object["title"] as? String) ?? (object["detail"] as? String)
    }

    func fetchCurrentUser(accessToken: String) async throws -> UserContext {
        let (data, _) = try await requestData(path: "/api/v1/me", accessToken: accessToken)
        return try decoder.decode(UserContext.self, from: data)
    }

    func fetchLeads(accessToken: String, query: LeadsQuery = LeadsQuery()) async throws -> [LeadDto] {
        let (data, _) = try await requestData(path: "/api/v1/leads", accessToken: accessToken, query: query.queryItems)
        return try decoder.decode([LeadDto].self, from: data)
    }

    func fetchLeadMetadata(accessToken: String) async throws -> LeadModuleMetadataDto {
        let (data, _) = try await requestData(path: "/api/v1/leads/metadata", accessToken: accessToken)
        return try decoder.decode(LeadModuleMetadataDto.self, from: data)
    }

    func createLead(accessToken: String, request payload: CreateLeadRequestBody) async throws -> LeadDto {
        let data = try JSONEncoder().encode(payload)
        let (responseData, _) = try await requestData(path: "/api/v1/leads", method: "POST", accessToken: accessToken, body: data)
        return try decoder.decode(LeadDto.self, from: responseData)
    }

    func updateLead(accessToken: String, leadId: String, request payload: UpdateLeadRequestBody) async throws -> LeadDto {
        let data = try JSONEncoder().encode(payload)
        let (responseData, _) = try await requestData(path: "/api/v1/leads/\(leadId)", method: "PUT", accessToken: accessToken, body: data)
        return try decoder.decode(LeadDto.self, from: responseData)
    }

    func exportLeads(accessToken: String, query: LeadsQuery = LeadsQuery()) async throws -> DownloadedFile {
        let url = try await buildURL(path: "/api/v1/leads/export", query: query.queryItems)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            guard (200...299).contains(http.statusCode) else {
                if let payload = parseErrorPayload(data) {
                    throw APIError.requestFailed(status: http.statusCode, message: payload)
                }
                throw APIError.requestFailed(status: http.statusCode, message: "Server error")
            }
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            let fileName = extractFileName(http, fallback: "leads-export.xlsx")
            return DownloadedFile(data: data, suggestedFileName: fileName)
        } catch {
            if let apiError = error as? APIError {
                throw apiError
            }
            throw APIError.transport(error)
        }
    }

    func fetchStatisticsReport(accessToken: String, query: StatisticsReportQuery) async throws -> SalesMonthlyReportDto {
        let (data, _) = try await requestData(path: "/api/v1/statistics-report", accessToken: accessToken, query: query.queryItems)
        return try decoder.decode(SalesMonthlyReportDto.self, from: data)
    }

    func exportStatisticsReport(accessToken: String, query: StatisticsReportQuery) async throws -> DownloadedFile {
        let url = try await buildURL(path: "/api/v1/statistics-report/export", query: query.queryItems)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            guard (200...299).contains(http.statusCode) else {
                if let payload = parseErrorPayload(data) {
                    throw APIError.requestFailed(status: http.statusCode, message: payload)
                }
                throw APIError.requestFailed(status: http.statusCode, message: "Server error")
            }
            guard let http = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            let fileName = extractFileName(http, fallback: "statistics-report.xlsx")
            return DownloadedFile(data: data, suggestedFileName: fileName)
        } catch {
            if let apiError = error as? APIError {
                throw apiError
            }
            throw APIError.transport(error)
        }
    }

    func writeToTemporaryFile(_ downloaded: DownloadedFile, preferredPrefix: String) throws -> URL {
        let fileName = downloaded.suggestedFileName ?? "\(preferredPrefix).xlsx"
        let safeFile = fileName.isEmpty ? "\(preferredPrefix).xlsx" : fileName
        let destination = FileManager.default.temporaryDirectory.appendingPathComponent(safeFile)
        try downloaded.data.write(to: destination, options: .atomic)
        return destination
    }

    private func extractFileName(_ response: HTTPURLResponse, fallback: String) -> String {
        let header = response.value(forHTTPHeaderField: "Content-Disposition") ?? ""
        let filename = findDispositionValue(from: header, marker: "filename*=")
        if let filename {
            return filename
        }

        let plain = findDispositionValue(from: header, marker: "filename=")
        return plain?.trimmingCharacters(in: CharacterSet(charactersIn: "\"")) ?? fallback
    }

    private func findDispositionValue(from header: String, marker: String) -> String? {
        guard let range = header.range(of: marker, options: .caseInsensitive) else {
            return nil
        }
        let tail = String(header[range.upperBound...])
        guard let parameter = tail
            .split(separator: ";", maxSplits: 1)
            .first?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              !parameter.isEmpty else {
            return nil
        }

        if marker == "filename*=" {
            if let splitPoint = parameter.range(of: "''") {
                let encoded = String(parameter[splitPoint.upperBound...])
                return encoded.removingPercentEncoding ?? encoded
            }
            return parameter.removingPercentEncoding ?? parameter
        }

        return parameter.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
    }
}
