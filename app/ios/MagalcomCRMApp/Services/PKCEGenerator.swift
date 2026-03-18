import Foundation
import CryptoKit

enum PKCEGenerator {
    private static let allowedCharacters = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")

    static func createCodeVerifier() -> String {
        let randomBytes = (0..<64).compactMap { _ in allowedCharacters.randomElement() }
        return String(randomBytes)
    }

    static func createCodeChallenge(from verifier: String) -> String {
        guard let data = verifier.data(using: .utf8) else {
            return ""
        }

        let digest = SHA256.hash(data: data)
        return base64URLEncode(Data(digest))
    }

    private static func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .trimmingCharacters(in: CharacterSet(charactersIn: "="))
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
    }
}
