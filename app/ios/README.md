# iOS Sales Companion

Native iOS companion for salespersons with:

- Microsoft Entra OAuth login/logout.
- Leads list.
- Lead reporting summary screen backed by `/api/v1/statistics-report`.
- XLSX report downloads for both leads and statistics reports.

All source lives under `app/ios/MagalcomCRMApp`.

## Files added

- `MagalcomCRMApp/MagalcomCRMApp.swift` – app entry and shell.
- `MagalcomCRMApp/Services/AuthService.swift` – Entra login and token lifecycle.
- `MagalcomCRMApp/Services/APIClient.swift` – API calls to `/api/v1/leads` and `/api/v1/statistics-report`.
- `MagalcomCRMApp/ViewModels/LeadsViewModel.swift` – leads query, loading, and export.
- `MagalcomCRMApp/ViewModels/ReportViewModel.swift` – report query, loading, and export.
- `MagalcomCRMApp/Views/LoginView.swift` – sign-in entry.
- `MagalcomCRMApp/Views/MainTabView.swift` – tab layout for leads and report.
- `MagalcomCRMApp/Views/LeadsView.swift` – leads list and export screen.
- `MagalcomCRMApp/Views/ReportView.swift` – report screen and report export.
- `MagalcomCRMApp/Views/ShareSheet.swift` – iOS share sheet helper.
- `MagalcomCRMApp/Info.plist` – config placeholders for Entra and API base URL.

## Setup

1. Open an iOS app target in Xcode and add files under `app/ios/MagalcomCRMApp`.
2. Replace placeholder values in `Info.plist`:
   - `API_BASE_URL`
   - `ENTRA_TENANT_ID`
   - `ENTRA_CLIENT_ID`
   - `ENTRA_SCOPE`
3. Ensure the redirect URI scheme is configured in Azure Entra for the native app (for example `magalcomcrm`).
4. Set the same value in `ENTRA_REDIRECT_URI` and in `CFBundleURLTypes`.
5. Run and sign in with a user assigned role `CrmUser` (or `Admin`).
