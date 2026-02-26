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

## Run with .NET SDK

```bash
dotnet run --project src/WebApi/WebApi.csproj --urls http://localhost:7002
dotnet run --project src/WebApp/WebApp.csproj --urls http://localhost:7001
dotnet run --project src/Backend/Backend.csproj --urls http://localhost:7003
```

## Authentication modes
- Development default: `Authentication:DisableAuthentication=true` in `WebApi` and `Shell:Authentication:DisableAuthentication=true` in `WebApp`.
- Production: disable flags set to `false`, and provide Entra tenant/client configuration.
