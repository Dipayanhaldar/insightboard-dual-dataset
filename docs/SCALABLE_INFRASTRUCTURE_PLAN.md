# InsightBoard scalable infrastructure plan

Status: incremental implementation plan for the feature branch only
Strategy: balanced architecture, free-first operating budget
Guardrail: no paid resources, service upgrades, database migrations, production deployments or Stage 2 changes without explicit approval.

## Current architecture baseline

- React + Vite frontend is served by the Express API service on Render.
- MongoDB/Mongoose stores account credentials and saved report snapshots.
- JWT is used for API authentication.
- API, authentication, AI BYOK and voice endpoints have Express rate limits.
- MongoDB connection attempts are reused within a warm process and include a retry cooldown.
- Liveness, readiness and version endpoints exist.
- Raw dashboard datasets and the dual-dataset comparison currently run in the browser; saved reports store a sanitized aggregate snapshot.

## Known capacity and reliability limits

1. The current Render Free web service runs one instance, can spin down, has no horizontal scaling, and is not a production availability guarantee. Free instances are suitable for previews and testing, not a public high-traffic SLA.
2. The current express-rate-limit defaults use process-local memory. Limits can reset on restart and are not shared between instances. They must be replaced with a shared store before horizontal scaling.
3. MongoDB pool limits apply per application process and per MongoDB server. Multiplying instances multiplies potential database connections. Pool sizes must be sized against the actual Atlas tier and measured concurrent database work.
4. There is no shared object-storage or background-job platform in this milestone. Do not persist uploads or generated artifacts on an ephemeral Render filesystem.
5. No queue, CDN, multi-region failover or automatic traffic distribution is being enabled in this phase.

## Incremental implementation stages

### Stage 0 — Baseline observability and safe connection management
- [x] Add bounded, environment-configurable MongoDB connection-pool settings.
- [x] Keep minimum pool size at zero by default to avoid idle connection consumption.
- [x] Bound the MongoDB wait queue and server-selection wait.
- [x] Add request correlation IDs in the X-Request-Id response header.
- [x] Log API method, path, status, duration and request ID without logging bodies, credentials, email addresses or query strings.
- [x] Gracefully close the HTTP listener and MongoDB connection on SIGTERM/SIGINT.
- [x] Test the request ID response contract.
- [ ] Confirm staging environment variables and database readiness.
- [ ] Run staging smoke tests for register, login, saved-report create/list/delete and existing dashboard flows.

### Stage 1 — Authentication and tenant isolation review
- Review every account/report query for owner scoping.
- Add cross-user access tests and account deletion/data export workflows.
- Add signup abuse controls, email verification and password reset only with a secure delivery mechanism.
- Add audit-safe security events without recording passwords, tokens or personal dataset contents.
- Keep JWT secret server-side and rotate only with a planned session invalidation strategy.

### Stage 2 — Shared controls before horizontal scaling
- Replace in-memory rate-limit storage with a shared atomic store.
- Use shared per-user and per-IP quotas for authentication, AI and expensive operations.
- Add idempotency keys to future side-effecting operations.
- Introduce a queue only for workloads that exceed safe request timeouts: imports, exports, AI generation and document extraction.
- Use object storage for uploaded files and generated artifacts; keep only metadata and ownership in MongoDB.
- Define retention, deletion, backup and restore procedures before storing user files.

### Stage 3 — Measured performance work
- Add database indexes from observed query plans, not guesses.
- Add pagination and projection to list endpoints.
- Measure API P50/P95/P99 latency, error rates, CPU/memory, event-loop lag, DB pool wait time and connection counts.
- Load test representative flows and establish a capacity baseline.
- Tune pool size and request concurrency using the measured workload.

### Stage 4 — Controlled scaling
- Only after shared rate limits, shared file storage, safe session behavior and load tests pass, evaluate additional Render instances or a second equivalent origin.
- Keep one authoritative database and one shared object store.
- Check the aggregate connection budget across all instances before increasing instance count.
- Use readiness checks for traffic routing and retain rollback controls.
- Multi-region failover is a separate project requiring replication, consistency and recovery testing.

## Free-first operating policy

- Keep the existing staging service on its current plan.
- Do not create paid Redis, object storage, worker, database, monitoring or load-balancer resources.
- Prefer browser-local processing for datasets that do not need server persistence.
- Keep user-provided AI keys BYOK; do not enable site-funded AI by default.
- Add budget alerts and hard quotas before any future site-funded usage.
- If a required reliability control cannot be delivered safely on the free tier, document the limitation and ask for approval instead of silently upgrading.

## Release acceptance gates

- CI syntax checks, tests and frontend build pass.
- Staging health/readiness and version endpoints are verified.
- Existing dashboard, authentication and saved-report flows are smoke-tested.
- Cross-user access tests pass before calling the account layer multi-tenant safe.
- No secret, request body, dataset rows or provider keys appear in logs.
- Production and Stage 2 remain unchanged until separately approved.
