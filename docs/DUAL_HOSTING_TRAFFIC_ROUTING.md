# Dual Hosting, Traffic Distribution and Failover

Status: architecture decision; first health/version probe endpoints implemented on the feature branch
Scope: preserve the current InsightBoard experience and add hosting resilience without removing existing features.

## 1. Product compatibility rule

Existing InsightBoard functionality remains the baseline and must continue working:
- Dataset upload, dataset switching, filters, KPIs, charts, record table and CSV/PDF exports.
- Saved reports and existing account flows.
- AI Provider Hub and Bring Your Own Key (BYOK) behavior.
- Gnani Voice Studio and existing integrations.
- Current responsive layout and routes.

New AI platform features are additive modules. Do not replace, hide, rename, or regress existing capabilities. Every release must pass regression tests for existing modules.

## 2. Hosting goal

The desired user experience is one canonical website address and one consistent product. Traffic should be distributed between Vercel and Render when both are healthy, and routed away from an unhealthy origin automatically.

Do not ask users to choose between separate Vercel and Render URLs. Users should see one canonical domain, for example `app.<owned-domain>`.

## 3. Important distinction: hosting roles vs. duplicate origins

The current repository configuration does not yet establish two equivalent production origins:
- `render.yaml` describes a Render web service that builds the Vite frontend and starts the Express server.
- `RELEASE_PROCESS.md` identifies a Render production service and a separate Render staging service.
- `vercel.json` currently contains deployment configuration but does not establish a Vercel production service running the complete Express API.
Therefore, do not claim traffic is currently load-balanced or that both providers currently run identical production functionality.

There are two valid deployment patterns:

### Pattern A — split frontend/backend (simpler, not full-site load balancing)
- Vercel serves the web frontend.
- Render serves the Express API.
- The frontend calls the canonical API hostname.
- This is a clean division of responsibilities but it is not two interchangeable full-site origins. If Render API fails, Vercel frontend alone cannot provide the complete application.

### Pattern B — dual complete application origins (matches the requested goal)
- Vercel and Render each run a deployable instance of the complete web application and compatible API.
- A Cloudflare Load Balancer (or another health-aware reverse proxy) sits behind one canonical domain.
- Both origins receive the same tested release version.
- Health checks remove an unhealthy origin from rotation; weighted steering distributes traffic when both are healthy.
- Failover returns traffic to the remaining healthy origin automatically.

Pattern B is the target architecture if both websites must have the same functionality and traffic must be distributed between them.

## 4. Required architecture for Pattern B

Canonical domain:
- DNS points to the load-balancer/proxy, not directly to either app origin.
- Configure TLS and origin authentication.
- Keep provider-specific origin hostnames private or protected where possible.

Origin pool:
- Origin 1: Vercel deployment of the complete app.
- Origin 2: Render deployment of the complete app.
- Both must expose equivalent paths, including frontend routes and API routes.
- Both must return compatible responses and support the same app version.

Routing:
- Use health-aware weighted distribution, for example 50/50 after load testing.
- If one origin fails health checks, send 100% of new traffic to the healthy origin.
- Restore an origin only after consecutive successful checks.
- Use a low but safe health-check interval and alert on origin degradation.
- Do not use simple DNS round-robin as the only failover mechanism; DNS caching makes failover slow and unreliable.
- Preserve the canonical hostname for cookies, redirects, OAuth callbacks and CORS.

## 5. Data consistency requirements

Two app hosts must not mean two independent data stores.

Both origins must share:
- One authoritative MongoDB cluster/database for users, reports, conversations and usage.
- The same JWT signing/verification secret and compatible token settings.
- The same durable object/file storage (never rely on local instance disk).
- The same environment configuration for provider allowlists and feature flags.
- Shared rate-limit and quota counters (Redis or a database-backed atomic limiter), not per-process in-memory counters.
- Shared idempotency records for payments and side-effecting requests.
- A common session/authentication strategy.

Use database indexes and atomic updates for usage/quota accounting. Define backup, restore and point-in-time recovery. Avoid dual writes to separate databases.

## 6. Code and release parity

- One GitHub repository and one approved release commit.
- CI builds and tests both deployment targets from the same commit SHA.
- Deploy to staging first and run existing InsightBoard regression tests.
- Deploy the same artifact/version to Vercel and Render.
- Run health and smoke tests against each origin directly before putting it into the pool.
- Only then enable traffic distribution.
- Roll back both origins to the same known-good release if a regression is found.
- Never let Vercel deploy a different branch/version from Render production.

## 7. Portability work required

The current app is Vite + Express and Render starts it as a single Node service. Vercel does not automatically run an arbitrary long-lived Express process in the same way.

Before dual-origin load balancing:
1. Separate API route logic from the Express transport adapter.
2. Create a Vercel-compatible serverless/function adapter for the same API handlers, or choose a portable deployment mode that can run the complete app on both providers.
3. Keep streaming behavior compatible on both platforms and verify timeouts/connection limits.
4. Move uploads and generated files to shared object storage.
5. Move rate limiting and usage counters to shared storage.
6. Add `/api/health/live` and `/api/health/ready`; readiness must verify dependencies needed to serve traffic.
7. Add a release/version endpoint such as `/api/version` returning commit SHA and build ID.
8. Verify both origins return the same API contract and feature set.

Do not add a load balancer until these portability and parity checks pass.

## 8. Health check contract

- `GET /api/health/live`: process is alive; should not fail only because a downstream dependency is briefly unavailable.
- `GET /api/health/ready`: instance can safely serve user traffic; verify required database and critical dependencies.
- `GET /api/version`: build version, commit SHA and release identifier; never return secrets or internal configuration.

The load balancer should use readiness, not just a TCP connection or homepage response.

## 9. Capacity and traffic policy

Start with a conservative split only after both providers are provisioned and load-tested. A 50/50 weight is a starting experiment, not a capacity guarantee.

Monitor per origin:
- Requests per second and concurrent requests.
- P50/P95/P99 latency.
- HTTP 5xx and timeout rates.
- CPU/memory and serverless concurrency.
- Database connection pool saturation.
- AI provider latency and spend.
- Health-check status and failover events.

Do not assume traffic automatically moves because one website is busy. Standard load balancers generally route based on configured weights and health, not an application-level understanding of user demand. For load-based routing, use supported adaptive/load-based steering only after verifying the provider's capability and pricing.

Protect against overload:
- Set per-origin concurrency and request limits.
- Apply backpressure and bounded queues for expensive background tasks.
- Rate-limit users globally across both origins.
- Return controlled 429/503 responses rather than letting both hosts collapse.
- AI usage limits must be shared so switching origins cannot bypass quotas.

## 10. Rollout sequence

1. Preserve current Render production and Vercel deployments unchanged.
2. Document the actual Vercel project, build settings, domains and environment variables.
3. Make API handlers portable and shared.
4. Deploy the same candidate release to a non-production Vercel deployment and Render staging.
5. Run the full existing InsightBoard regression suite against both.
6. Verify shared database, auth, file storage, usage counters and streaming.
7. Run load tests and failover drills.
8. Configure the canonical domain and load-balancer pool.
9. Start with a small weighted canary, then increase distribution based on evidence.
10. Enable automatic unhealthy-origin failover.
11. Keep manual rollback and origin-disable controls.

## 11. Acceptance criteria

The dual-hosting feature is not complete until:
- Existing InsightBoard features work on both origins.
- Both origins report the same release commit SHA.
- A user can start a session on one origin and continue on the other.
- Conversation/report data is consistent after switching origins.
- Rate limits and usage budgets cannot be bypassed by switching hosts.
- A simulated origin outage removes that origin from traffic.
- Traffic continues through the remaining origin.
- Recovery returns the origin only after passing readiness checks.
- No secrets are exposed in frontend bundles or health endpoints.
- Costs, provider limits and load-balancer pricing are approved before production enablement.

## 12. Current state

This document remains the architecture requirement; no dual-origin hosting or traffic routing has been enabled. The feature branch now adds `/api/health/live`, `/api/health/ready`, and `/api/version` while preserving the legacy `/api/health` route. The Express app is exported without starting a listener on import, and infrastructure probes bypass the general API rate limiter. MongoDB connections are now created on demand for readiness checks and database-backed routes, with one in-flight connection attempt per warm process and a short retry cooldown after failures. Standalone Render-style startup still initiates the same shared connection routine. Automated Node tests cover liveness, disconnected-database readiness, the legacy health response and version metadata; CI runs these tests. Readiness currently checks MongoDB connectivity only; additional critical dependencies must be added to the readiness contract when introduced. This is preparation for adapter reuse, not yet a Vercel serverless adapter or a production-ready dual-host deployment. No DNS, Cloudflare Load Balancer, Vercel project, Render service, production environment variables, traffic weights or production routing have been changed. The existing production deployment remains untouched.
