# Local Development

## Ports
- WebApp: `http://localhost:7001`
- WebApi: `http://localhost:7002`
- Backend: `http://localhost:7003`
- SQL Server: `localhost:1433`

## Run with Docker Compose

```bash
docker compose -f deploy/docker/docker-compose.local.yml up --build
```

Before running, replace the `REPLACE_WITH_*` values in `src/WebApp/appsettings.json` and `src/WebApi/appsettings.json`, or override them with environment variables.

The compose stack now:

- starts SQL Server
- publishes `src/Database/Magalcom.Crm.Database.sqlproj`
- starts `WebApi`, `Backend`, and `WebApp`

## Run with .NET SDK

```bash
dotnet run --project src/WebApi/WebApi.csproj --urls http://localhost:7002
dotnet run --project src/WebApp/WebApp.csproj --urls http://localhost:7001
dotnet run --project src/Backend/Backend.csproj --urls http://localhost:7003
```

## Authentication modes
- Configure Entra in `src/WebApp/appsettings.json` and `src/WebApi/appsettings.json`.
- The shell uses MSAL in the browser and acquires a delegated token for the API scope.
- No client secret is required for the shell or API in this architecture.
- Cloud Shell setup commands are in [docs/entra-id-setup.md](/Users/yair/dev/magalcom-crm/docs/entra-id-setup.md).

## Data provider
- Docker Compose uses `DataAccess:Provider=SqlServer`.
- Direct `dotnet run` still defaults to `InMemory` unless a SQL Server connection string is configured explicitly.

## Sitemap and Mini-App links
- The shell menu is served from `GET /api/v1/sitemap`.
- Menu items are configured in `src/WebApi/appsettings.json` under `Shell:Navigation:Items`.
- A menu item can point directly to a mini-app by setting `MiniAppId` and leaving `Route`/`Title` empty; the API resolves those values from `MiniApps:Items`.
