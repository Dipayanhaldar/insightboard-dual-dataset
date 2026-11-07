# Global AI Platform — Implementation Work Items

This file converts the product blueprint into reviewable work.

## Epic 0 — Baseline and repository safety
- [ ] Record current main commit and dependency baseline.
- [x] Verify package scripts, CI checks, and deployment target.
- [ ] Inventory frontend routes and API endpoints.
- [ ] Inventory environment-variable usage and confirm no secrets are committed.
- [ ] Document staging smoke-test steps for existing InsightBoard functionality.
- [x] Add `/api/health/live` for process liveness without changing the legacy `/api/health` contract.
- [x] Add `/api/health/ready` with HTTP 503 while MongoDB is unavailable.
- [x] Add `/api/version` for release/version checks; commit SHA is populated when the host exposes a supported commit environment variable.
- [x] Add automated tests for probe status codes and response contracts.
- [x] Export the Express app without opening a listener on import, enabling test and adapter reuse.
- [x] Exempt infrastructure probes from the general API rate limiter so health checks are not blocked by user traffic.
- [x] Add a shared on-demand MongoDB connection routine for serverless requests and standalone server startup, with single-flight connection attempts and a retry cooldown.

## Epic 1 — Conversation API
- [ ] Define validated request/response schemas.
- [ ] Add conversation create/list/rename/delete endpoints.
- [ ] Add message history endpoint with pagination.
- [ ] Enforce ownerId on every database query.
- [ ] Add tests for cross-user access denial.
- [ ] Add message size and conversation count limits.

## Epic 2 — AI orchestration
- [ ] Define provider adapter contract.
- [ ] Add server-controlled provider/model allowlist.
- [ ] Preserve existing BYOK provider support.
- [ ] Implement authenticated chat endpoint.
- [ ] Implement streaming with cancellation and timeout.
- [ ] Normalize provider errors without leaking upstream details.
- [ ] Add token and request usage accounting.

## Epic 3 — Financial guardrails
- [ ] Per-user quotas and per-IP abuse limits.
- [ ] Hard global monthly spend ceiling for site-funded calls.
- [ ] Output token ceiling and tool-specific caps.
- [ ] Usage dashboard and admin alerts.
- [ ] Kill switch to stop site-funded AI generation.

## Epic 4 — Web user experience
- [ ] Chat workspace responsive layout.
- [ ] New chat, rename, archive and delete.
- [ ] Streaming and stop-generation controls.
- [ ] Model picker driven by backend capabilities.
- [ ] Error, empty, loading and retry states.
- [ ] Privacy, data export and account deletion flows.

## Epic 5 — Android application
- [ ] Create Expo app in apps/android.
- [ ] Shared API client and auth lifecycle.
- [ ] Sign-in and account settings.
- [ ] Chat and history.
- [ ] Keyboard/safe-area/accessibility handling.
- [ ] Build signed APK and AAB reproducibly.
- [ ] Test API configuration and deep links.

## Epic 6 — Public beta readiness
- [ ] Security review and dependency audit.
- [ ] Privacy notice, terms and retention policy.
- [ ] Account deletion and data export verified.
- [ ] Abuse controls, monitoring and incident runbook.
- [ ] Provider pricing and budget verified.
- [ ] Android app listing assets and compliance declarations.
- [ ] Production promotion PR reviewed and approved.

## Epic 7 — Render-first deployment foundation
- [x] Add bounded MongoDB pool configuration, request IDs, privacy-conscious API request logs and graceful process shutdown.
- [x] Document balanced free-first scaling stages and hard no-paid-resource guardrails in `docs/SCALABLE_INFRASTRUCTURE_PLAN.md`.
- [x] Keep Render as the active deployment target for this release train.
- [x] Preserve the existing Render dist build and Express static-serving path.
- [x] Add on-demand MongoDB connection reuse and liveness/readiness/version probes.
- [x] Run server syntax checks, API tests and frontend build in GitHub Actions.
- [ ] Verify the current release commit with live Render staging smoke tests.
- [ ] Add distributed rate limiting and shared session/usage state before horizontal scaling.
- [ ] Design and test shared file storage before multi-instance file workflows.
- [ ] Revisit multi-host deployment only after explicit routing, data-consistency and failover tests.

## Epic 8 — Data intelligence product differentiation
- [x] Add an independent second-dataset upload workflow without replacing the active dashboard dataset.
- [x] Match exact shared fields and identify numeric fields comparable across both datasets.
- [x] Compare row counts, schema overlap, numeric averages and exact category distributions.
- [x] Export metric comparison results as CSV.
- [ ] Add guided field mapping, join/append preview and reversible data cleaning.
- [ ] Add profiling, outlier and statistical comparison methods with visible assumptions.
- [ ] Add a report builder that saves reproducible analysis snapshots.
- [ ] Add evidence-linked AI explanations after server-side quotas and privacy controls are ready.
