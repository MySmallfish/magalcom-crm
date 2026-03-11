# Native Bundle

## Target
- Windows Server
- IIS hosts `WebApp` and `WebApi`
- Windows Service hosts `Backend`
- Existing SQL Server receives the dacpac deployment

## Expected Package Layout
- `webapp/`
- `webapi/`
- `backend/`
- `database/Magalcom.Crm.Database.dacpac`
- `config/appsettings.WebApp.Production.template.json`
- `config/appsettings.WebApi.Production.template.json`
- `config/appsettings.Backend.Production.template.json`
- `scripts/install-iis-site.ps1`
- `scripts/install-backend-service.ps1`
- `scripts/publish-database.ps1`
- `scripts/install-native.ps1`
- `deploy-manifest.json`

## Packaging Script
- Use `deploy/package/create-native-bundle.sh`.
- Validate the produced archive with `deploy/package/validate-bundle.sh native <archive> <version>`.
