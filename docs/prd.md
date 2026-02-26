# Magalcom CRM Foundation PRD

## Objective
Build a secure, extensible web-based CRM platform with a shell web application, a minimal API layer, and backend workers. The system provides a foundation for staged delivery of shared infrastructure and Lead Management.

## Scope and stages

### Stage 1: Basic buildup
- Create repository/project structure for WebApp, WebApi, Backend, shared libraries, tests, and deployment assets.
- Implement shell SPA hosted by WebApp.
- Integrate Entra ID authentication flow in shell (MSAL + OIDC/OAuth2 PKCE).
- Implement basic shell UX:
  - Side menu
  - Profile popover
  - Profile page
  - Logout
  - Sitemap from API (`/api/v1/sitemap`)
- Implement mini-app iframe host with context propagation via `postMessage`.
- Add foundational logging and health endpoints.

### Stage 2: Shell infrastructure
- XState-based shell state management.
- Command pattern and event bus for UI actions.
- Dynamic template loading and reusable web components (`grid`, `form`, `commands`, `menu`).
- Mini-app registry/routing infrastructure.
- Typed contracts for shell context/events/commands.
- Data access abstraction with in-memory implementations first, SQL implementations by end of stage.
- Messaging abstractions for Azure Service Bus.

### Stage 3: Lead Management
- Lead bounded context with CRUD and lifecycle tracking.
- Reporting/prediction job orchestration with backend workers.
- Role-based authorization and scope filtering.
- Admin management for projects and formulas.
- Reporting drill-down by department/domain/sales person/project.

## Non-functional requirements
- .NET 10 runtime across all services.
- HTTPS/JSON APIs, SignalR-ready design points.
- Entra ID single-tenant auth model.
- Internal allowlist for mini-app iframe origins.
- Structured logging with correlation IDs.
- Health endpoints (`/health/live`, `/health/ready`).

## Key technical decisions
- Frontend: Vanilla Web Components + XState.
- API authentication: direct SPA access tokens.
- Messaging: Azure Service Bus contracts and abstraction.
- Data layer convention:
  - Read from views with `View` suffix.
  - Write via business-named stored procedures.
  - Expose data operations through interfaces like `ILeadDataService`.

## API surface (initial)
- `GET /api/v1/me`
- `GET /api/v1/sitemap`
- `GET /api/v1/miniapps`
- `GET /api/v1/leads`
- `GET /api/v1/leads/{id}`
- `POST /api/v1/leads`
- `PUT /api/v1/leads/{id}`
- `POST /api/v1/reports/predictions/jobs`
- `GET /api/v1/reports/predictions/jobs/{jobId}`
- `GET /api/v1/admin/projects`
- `PUT /api/v1/admin/projects/{id}`
- `GET /api/v1/admin/formulas`
- `PUT /api/v1/admin/formulas/{id}`

## Acceptance criteria highlights
- Entra login works and shell shows user context.
- Sitemap renders dynamically from API response.
- Mini-app iframe receives validated context message.
- Lead API endpoints functional with swappable data provider.
- Role-based admin endpoints enforce authorization.
