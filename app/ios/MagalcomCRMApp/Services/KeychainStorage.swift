import Foundation
import Security

enum KeychainStorageError: Error, LocalizedError {
    case decodeFailure
    case keychainStatus(OSStatus)

    var errorDescription: String? {
        switch self {
        case .decodeFailure:
            return "Stored session data is invalid."
        case .keychainStatus(let status):
            let message = SecCopyErrorMessageString(status, nil) as String?
            if let message, !message.isEmpty {
                return "Keychain failure (\(status)): \(message)"
            }
            return "Keychain failure (\(status))."
        }
    }
}

final class KeychainStorage {
    private let service = "com.magalcom.crm.ios"
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let userDefaults = UserDefaults.standard

    init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    func save<T: Encodable>(_ value: T, forKey key: String) throws {
        let data = try encoder.encode(value)
        do {
            try saveToKeychain(data, forKey: key)
            #if targetEnvironment(simulator)
            userDefaults.removeObject(forKey: fallbackKey(for: key))
            #endif
        } catch {
            #if targetEnvironment(simulator)
            userDefaults.set(data, forKey: fallbackKey(for: key))
            #else
            throw error
            #endif
        }
    }

    func load<T: Decodable>(_ type: T.Type, forKey key: String) throws -> T? {
        do {
            if let data = try loadFromKeychain(forKey: key) {
                return try decode(type, from: data)
            }
        } catch {
            #if targetEnvironment(simulator)
            if let fallback = userDefaults.data(forKey: fallbackKey(for: key)) {
                return try decode(type, from: fallback)
            }
            #endif
            throw error
        }

        #if targetEnvironment(simulator)
        if let fallback = userDefaults.data(forKey: fallbackKey(for: key)) {
            return try decode(type, from: fallback)
        }
        #endif

        return nil
    }

    func delete(forKey key: String) throws {
        let query = baseQuery(forKey: key)
        let status = SecItemDelete(query as CFDictionary)

        if status != errSecSuccess && status != errSecItemNotFound {
            #if !targetEnvironment(simulator)
            throw KeychainStorageError.keychainStatus(status)
            #endif
        }

        #if targetEnvironment(simulator)
        userDefaults.removeObject(forKey: fallbackKey(for: key))
        #endif
    }

    private func saveToKeychain(_ data: Data, forKey key: String) throws {
        let query = baseQuery(forKey: key)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: keychainAccessibility
        ]

        let existing = SecItemCopyMatching(query as CFDictionary, nil)
        switch existing {
        case errSecSuccess:
            let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            guard status == errSecSuccess else {
                throw KeychainStorageError.keychainStatus(status)
            }
        case errSecItemNotFound:
            let addQuery = query.merging(attributes) { _, new in new }
            let status = SecItemAdd(addQuery as CFDictionary, nil)
            guard status == errSecSuccess else {
                throw KeychainStorageError.keychainStatus(status)
            }
        default:
            throw KeychainStorageError.keychainStatus(existing)
        }
    }

    private func loadFromKeychain(forKey key: String) throws -> Data? {
        let query: [String: Any] = baseQuery(forKey: key).merging([
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]) { _, new in new }

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status != errSecItemNotFound else {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainStorageError.keychainStatus(status)
        }
        guard let data = result as? Data else {
            throw KeychainStorageError.decodeFailure
        }
        return data
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw KeychainStorageError.decodeFailure
        }
    }

    private func baseQuery(forKey key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
    }

    private func fallbackKey(for key: String) -> String {
        "keychain.fallback.\(service).\(key)"
    }

    private var keychainAccessibility: CFString {
        #if targetEnvironment(simulator)
        return kSecAttrAccessibleAfterFirstUnlock
        #else
        return kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        #endif
    }
}
