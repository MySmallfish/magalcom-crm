# Magalcom CRM

Foundational infrastructure for Magalcom CRM built with .NET 10.

## Solution layout

- `src/WebApp`: shell host (SPA + mini-app host)
- `src/WebApi`: minimal API for CRM modules
- `src/Backend`: background services and long-running jobs
- `src/Shared/*`: contracts, messaging, data abstractions
- `src/Frontend/ShellSpa`: shell SPA source
- `tests/*`: unit/integration/contract/e2e test projects
- `deploy/docker`: Dockerfiles and local compose
- `docs`: PRD, architecture, and contracts

## Implemented foundation

- Stage 1 baseline:
  - WebApp shell host with health endpoints and runtime config endpoint.
  - WebApi minimal API with auth, sitemap, profile, mini-apps, leads, reports job, admin endpoints.
  - Backend host with scheduled/background worker scaffolding and health endpoints.
  - Shell SPA with side menu, profile popover/page, logout, mini-app iframe host, and postMessage context.
- Stage 2 infrastructure scaffolding:
  - XState root machine.
  - Command registry + event bus.
  - Dynamic template loading.
  - Reusable web components for menu, command bar, form, grid, and mini-app frame.
- Stage 3 scaffold:
  - Lead contracts + in-memory CRUD endpoints.
  - Admin project/formula contracts + endpoints.
  - Prediction job request/status endpoints backed by in-memory job store.

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

- Authentication is disabled in development config and replaced with a development identity.
- Data provider defaults to `InMemory`.
- SQL Server implementations are scaffolded and intentionally throw `NotImplementedException` until Stage 2 SQL wiring is completed.
