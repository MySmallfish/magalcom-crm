# Magalcom CRM

Foundational infrastructure for Magalcom CRM built with .NET 10.

## Solution layout

- `src/WebApp`: shell host (SPA + mini-app host)
- `src/WebApi`: minimal API for shell infrastructure, identity, sitemap, mini-apps, and shared admin endpoints
- `src/Backend`: background service scaffolding
- `src/Shared/*`: contracts, messaging, data abstractions
- `src/Frontend/ShellSpa`: shell SPA source
- `src/Database`: SQL Server database project and deployment scripts
- `tests/*`: unit/integration/contract/e2e test projects
- `deploy/docker`: Dockerfiles and local compose
- `docs`: PRD, architecture, and contracts

## Implemented foundation

- Stage 1 baseline:
  - WebApp shell host with health endpoints and runtime config endpoint.
  - WebApi minimal API with auth, sitemap, profile, mini-apps, and admin endpoints.
  - Backend host with scheduled/background worker scaffolding and health endpoints.
  - Shell SPA with side menu, profile page, logout, mini-app iframe host, and postMessage context.
- Stage 2 infrastructure scaffolding:
  - XState shell machine with session-loading and ready-state orchestration.
  - Command registry with middleware and command lifecycle events.
  - Event bus with wildcard subscriptions for shell-wide event propagation.
  - Dynamic template loading.
  - Plugin registry + route pattern matching for shell pages and mini-app modules.
  - Typed shell message/command/event contracts in frontend and shared C# contracts.
  - Reusable web components for menu, command bar, schema-driven form, data grid, and mini-app frame.
  - Config-driven sitemap with optional direct links to a specific mini-app.
- Shared persistence scaffold:
  - SQL Server database project for source-controlled schema and seed deployment.
  - Admin project/formula contracts + SQL-backed endpoints.

## Local prerequisites

- .NET 10 SDK
- Docker Desktop (for compose)

## Initial git setup

This repository is initialized with:

- Remote origin: `git@github.com:MySmallfish/magalcom-crm.git`

## Run locally (when dotnet is installed)

```bash
dotnet build src/Magalcom.Crm.sln
dotnet run --project src/WebApi/WebApi.csproj
dotnet run --project src/WebApp/WebApp.csproj
dotnet run --project src/Backend/Backend.csproj
```

## Run with Docker Compose

```bash
docker compose -f deploy/docker/docker-compose.local.yml up --build
```

## Current defaults

- Authentication requires Microsoft Entra ID configuration in `src/WebApp/appsettings.json` and `src/WebApi/appsettings.json`.
- Docker Compose publishes the SQL Server dacpac and runs `WebApi`/`Backend` against SQL Server.
- Standalone appsettings default to SQL Server in `WebApi`; override `DataAccess:Provider` only if you explicitly want an alternate provider.
- Mini-app registration is empty by default; add entries under `MiniApps:Items` and optional direct menu links under `Shell:Navigation:Items`.

## Entra ID setup

- Copy-paste Cloud Shell setup commands are documented in [docs/entra-id-setup.md](/Users/yair/dev/magalcom-crm/docs/entra-id-setup.md).
