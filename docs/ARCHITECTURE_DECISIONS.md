# Architecture Decision Records

## ADR-001: Extend the current React + Vite application before migrating frameworks
Status: Accepted for MVP

Context:
InsightBoard main already uses React + Vite and contains analytics dashboards, provider integrations and styling. A rewrite to Next.js would introduce migration risk without being required for the initial AI workspace.

Decision:
Keep React + Vite for the first web AI workspace. Re-evaluate Next.js only when SSR, routing, SEO or product scale provides a concrete benefit.

Consequences:
- Existing application and release pipeline remain intact.
- New AI features share current build and deployment.
- Route structure and code splitting require deliberate design.
- Future Next.js migration remains possible but is not a prerequisite.

## ADR-002: Keep Express as the first shared API
Status: Accepted for MVP

Context:
The repository already contains an Express server and API security middleware.

Decision:
Extend the existing API for chat, history, usage and admin functionality. Avoid a second parallel backend.

Consequences:
- One API surface for web and Android.
- Existing auth and database behavior must be reviewed before expanding.
- API versioning and shared contracts should be introduced.

## ADR-003: Preserve MongoDB during MVP
Status: Accepted provisionally

Context:
Existing account/report prototype uses Mongoose and MongoDB.

Decision:
Do not create a second database/auth source of truth while adding chat. Extend the existing persistence layer after schema and security review.

Consequences:
- Avoids a risky dual-database migration.
- Revisit Supabase/PostgreSQL only with a documented migration plan and data export strategy.

## ADR-004: Android is a separate Expo client
Status: Accepted

Decision:
Create an Expo React Native app that uses the shared API. Do not embed provider secrets in the mobile binary.

Consequences:
- Separate mobile release pipeline.
- Shared API types and validation should be package-based where practical.

## ADR-005: Provider-independent AI orchestration
Status: Accepted

Decision:
Define server-side adapters for providers, normalised messages/responses, model allowlists, quota policy and usage accounting. BYOK remains optional and explicitly disclosed.

Consequences:
- Provider changes do not require changes to every client.
- Each adapter needs tests and current provider documentation.
- Costs and provider terms remain provider-specific.
