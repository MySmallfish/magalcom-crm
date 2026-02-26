 Scope of Work
The scope of this project is to build a secure and modern web application platform that enables API and web
access to a BI module, and to add an AI chat-style interface for querying the BI data.
The offer includes the following components:
3.1 Infrastructure
Deliverables:
• A web application “shell” accessible via modern browsers.
• Authentication and authorization using Microsoft Entra ID (Azure AD) and pre-configured security
groups.
• A server-side API layer (ASP.NET Core) to serve the client application and expose BI endpoints.
• Backend services to support long-running processes, scheduled tasks, notifications, and integrations.
• Foundational logging and basic operational diagnostics.
• Hosting “mini apps” as a way to isolate & speed up development by departments (Sales, Maintenance,
etc.) or vertical domains (like BI/ CRM/ Invoicing, etc.) each “mini-app” benefit from contextual
information like the current user token & roles, as well as environmental information and focus only on
providing the specialized UX it was designed to.
• Server side will also designed for easily adding new APIs in isolated and secure way to support such mini
apps.
Acceptance criteria:
• Users can access the application from within the Magalcom network.
• Users authenticate via Microsoft Entra ID.
• After login, users are routed to a home screen displaying the current user identity and authorization
context (e.g., roles/groups).
3.2 CRM Leads Module
Deliverables:
• API endpoints and application components that allow sales personnel create and track leads.
• A Report screen to show prediction based on leads, grouped by projects.
• Basic Role Based security & Scoping - each.
Acceptance criteria:
• After login, the user can open the Leads page, add and update leads
• User can generate related reports (by department, domain, sales person,etc), see predictions and drill
down to specific project or domain.
• Admin users will be able to update Projects & Formulas for calculations.
4. Technical Approach
Development will use the Microsoft .NET (C#) technology stack in order to maximize maintainability,
developer availability, and documentation quality.
Key components:
• Client: HTML/CSS/JavaScript (framework to be selected: Vue or React).
• Server: ASP.NET Core application connected to Microsoft Entra ID, providing authentication and
authorization.
• Communication: HTTPS and, where needed, SignalR for real-time updates.
• Data: Microsoft SQL Server (existing).
• Messaging/queues (if required): Azure Service Bus or on‑prem RabbitMQ (selection to be aligned with
Magalcom infrastructure).
Architecture Diagram