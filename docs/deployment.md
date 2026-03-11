# Deployment

## Targets
Magalcom CRM supports two deployment targets from the same source tree:
- Native Windows deployment: `WebApp` and `WebApi` on IIS, `Backend` as a Windows Service, SQL schema published to an existing SQL Server from the bundled dacpac.
- Docker deployment: Linux/amd64 containers for `WebApp`, `WebApi`, and `Backend`, connecting to an existing SQL Server.

## Versioning
- Stable package versions come from [`src/Directory.Build.props`](/Users/yair/dev/magalcom-crm/src/Directory.Build.props).
- `VersionPrefix` is the release version source of truth.
- PR builds produce preview versions in the form `<VersionPrefix>-pr.<PR_NUMBER>.<RUN_NUMBER>`.

## Package Scripts
Use the scripts in `deploy/package/`:
- `check-version-bump.sh <base-branch>` validates that deployable PRs bumped `VersionPrefix`.
- `create-native-bundle.sh` builds `magalcom-crm-native-win-x64-<version>.zip`.
- `create-docker-bundle.sh` builds `magalcom-crm-docker-linux-amd64-<version>.tar.gz`.
- `validate-bundle.sh <native|docker> <archive> <version>` validates the produced bundle shape.

## GitHub Actions
- [`.github/workflows/pr-packages.yml`](/Users/yair/dev/magalcom-crm/.github/workflows/pr-packages.yml) builds and uploads both deployment bundles for every PR.
- [`.github/workflows/release-packages.yml`](/Users/yair/dev/magalcom-crm/.github/workflows/release-packages.yml) builds stable bundles on `master`, `main`, and `release/**` pushes.

## Native Deployment Package
The native bundle includes:
- IIS-ready publish outputs for `WebApp` and `WebApi`
- a Windows Service payload for `Backend`
- `Magalcom.Crm.Database.dacpac`
- production appsettings templates
- PowerShell scripts to install IIS sites, install or update the backend service, and publish the database

### Native Install Flow
1. Unzip the package to a staging directory on the Windows server.
2. Copy the appsettings templates from `config/` and replace the placeholders.
3. Publish the dacpac with `scripts/publish-database.ps1` or let `scripts/install-native.ps1` do it.
4. Run `scripts/install-native.ps1` with destination paths, ports, and the SQL connection string.

## Docker Deployment Package
The docker bundle includes:
- prebuilt image archives for `WebApp`, `WebApi`, and `Backend`
- `docker-compose.yml`
- `.env.template`
- the dacpac
- scripts to load images, bring the stack up, and publish the database

### Docker Install Flow
1. Extract the bundle on the target Linux host.
2. Copy `.env.template` to `.env` and fill in Entra ID, public URLs, SQL connection string, and Service Bus values.
3. Run `scripts/publish-database.sh` if the SQL schema must be updated from the package.
4. Run `scripts/deploy.sh` to load the images and start the stack.

## Local Packaging Notes
This workstation currently has Docker but no local `dotnet` CLI. The package scripts are designed for CI and for any local environment that has:
- `.NET 10 SDK`
- Docker for the docker bundle
- `zip` and `unzip` for validation
- `sqlpackage` on the target host when publishing the dacpac
