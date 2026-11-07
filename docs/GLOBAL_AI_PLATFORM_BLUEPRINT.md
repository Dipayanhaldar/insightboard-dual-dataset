# InsightBoard Global AI Platform — Product & Technical Blueprint

Status: planning baseline
Target: web + Android
Ownership: source code, repository, database schema, and deployment configuration remain owner-controlled.
Starting budget: free-first; paid usage enabled only after explicit cost review.

## 1. Product direction

Evolve InsightBoard into a public, globally accessible AI platform while preserving its existing analytics dashboard, dataset workflows, AI Provider Hub, and Gnani Voice Studio.

The product should combine:
- A general-purpose AI assistant with saved conversations.
- Provider-independent model routing.
- Document intelligence and research tools in later phases.
- Existing InsightBoard analytics capabilities as a differentiated product area.
- A responsive web experience and an Android application.
- A clear free/paid usage policy with hard cost controls.

Do not present unfinished capabilities as live. Do not remove or silently change existing InsightBoard behavior.

## 2. Repository strategy

The current main branch is React + Vite + JavaScript/JSX with a Node.js + Express backend prototype and MongoDB. The README documents account/report APIs and BYOK provider integrations. The release process already defines main as production and develop as staging.

Recommended evolution:
- Preserve React + Vite for the current web application in the first milestone.
- Continue the existing Express API rather than introduce a second backend.
- Keep MongoDB as the current persistence layer until a deliberate, reviewed migration is justified.
- Add a separate Expo/React Native Android application.
- Share TypeScript contracts and API client code as a gradual refactor, not a big-bang rewrite.
- Evaluate Supabase only as a future migration option; do not create a second source of truth for authentication/data during MVP.

## 3. Target architecture

Clients:
- Existing web app: React + Vite.
- Android app: Expo + React Native.
- Both clients consume same-origin/HTTPS API endpoints.

Application API:
- Existing Express service.
- Authentication, validation, quotas, usage ledger, conversation APIs, file metadata and admin endpoints.
- Centralised error handling and request IDs.

AI orchestration:
- Provider adapter interface.
- Provider/model registry with server-side allowlist.
- Model selection policy.
- Prompt and tool policy.
- Usage/cost estimation and quota enforcement.
- Request timeout, cancellation, retry policy and provider failover.
- Normalised response and streaming interface.

Persistence:
- Existing MongoDB for users and saved reports.
- Add conversations, messages, provider configuration metadata, usage events, files metadata, feedback and audit events with tenant/user ownership.
- Never store provider API keys in database.
- Do not store raw uploaded file content by default; define retention and deletion policy.

Infrastructure:
- GitHub as source of truth.
- Render staging and production follow RELEASE_PROCESS.md.
- Keep production auto-deploy disabled.
- Deploy Android through Expo/EAS or reproducible local Android builds.
- Add monitoring, logs, health checks and backup/restore procedures.

## 4. AI provider interface

Define a server-only provider contract with:
- generate(request): Promise<normalised response>
- stream(request): AsyncIterable<normalised event>
- validateModel(modelId)
- estimateCost(modelId, input, outputLimit)
- healthCheck()

Provider credentials must come from server environment or user-supplied BYOK credentials transmitted for a single request. Never return, log, persist or expose secrets. Provider adapters must be tested against provider-specific response/error formats.

Existing BYOK support should be preserved during initial integration. A site-managed key mode must be explicitly configured, quota-limited and cost-capped.

## 5. MVP scope

MVP-A — web foundation:
- Product landing page and clear disclosure of supported capabilities.
- Existing analytics dashboard remains functional.
- AI chat workspace with streaming, conversations, rename/delete and history.
- Authenticated user accounts.
- Provider/model selection from a server-controlled allowlist.
- BYOK mode preserved; site-managed mode disabled until budget controls are verified.
- Usage ledger and per-user/IP limits.
- User settings, privacy controls and account deletion workflow.
- Basic admin usage overview with server-enforced admin authorization.

MVP-B — Android:
- Expo app with sign-in, chat, conversation history and settings.
- Shared HTTPS API and authentication semantics.
- Android keyboard, safe-area, offline/error and accessibility testing.
- Signed APK for controlled testing and AAB for Google Play.

Not in MVP:
- Autonomous agents with external side effects.
- Unlimited free chat.
- Public developer API.
- Team workspaces.
- Image/video generation.
- Complex RAG ingestion pipeline.
These require separate threat models, budgets and acceptance criteria.

## 6. Data model additions

Plan and migrate only after review:
- Conversation: ownerId, title, createdAt, updatedAt, archivedAt.
- Message: ownerId, conversationId, role, content, modelId, status, token counts, createdAt.
- UsageEvent: ownerId, requestId, provider, model, input/output tokens, estimatedCost, currency, status, createdAt.
- FileRecord: ownerId, storageKey, safeName, MIME type, byteSize, checksum, scanStatus, retentionUntil.
- Feedback: ownerId, targetId, rating, category, comment, createdAt.
- AuditEvent: actorId, action, targetType, targetId, requestId, createdAt.
Use indexes for ownerId + timestamps and conversationId + timestamps. Enforce ownership in every query, not only the frontend.

## 7. Security and privacy requirements

- Keep provider credentials and JWT secrets on the server.
- Use strong random JWT secrets, short token lifetimes, rotation/revocation strategy and secure transport.
- Add authentication and authorization checks to every protected route.
- Admin privileges must come from server-controlled role data, never user-editable profile metadata.
- Add IP + user quotas, request body limits, timeouts and spending caps.
- Never log API keys, passwords, auth headers, uploaded document content or full sensitive prompts.
- Validate and constrain uploads by MIME, extension, size and content signature; scan before processing.
- Treat prompts, files, tool output and retrieved web content as untrusted.
- Require confirmation and scoped permissions before tools perform external side effects.
- Add account export/deletion and documented retention periods.
- Avoid storing raw analytics datasets; preserve the current aggregate-only report behavior.
- Conduct a security review before public launch.

## 8. Cost controls

- Default public beta to BYOK or a very small site-funded quota.
- Set hard monthly provider spend ceilings.
- Set per-user daily token and request caps.
- Set output token ceilings and request timeouts.
- Block expensive tools unless enabled for eligible plans.
- Track provider/model input and output usage per request.
- Alert at 50%, 75% and 90% of budget; automatically pause site-funded generation at 100%.
- Do not promise unlimited free usage.
- Record estimated costs and reconcile with provider invoices.

## 9. Delivery phases and acceptance criteria

Phase 0 — repository and product baseline:
- Preserve main.
- Use isolated feature branch and PR.
- Document current routes, environment variables, deployment and existing features.
- Establish baseline build and server checks.

Phase 1 — web AI workspace:
- Working authenticated chat endpoint.
- Streaming and cancellation.
- Save/list/delete conversation and messages.
- Usage ledger and enforced quotas.
- Provider key never reaches browser except explicit one-request BYOK mode.
Acceptance: build, server checks, integration tests, ownership tests, rate-limit tests and manual UI checks pass.

Phase 2 — admin, privacy and operational readiness:
- Admin authorization.
- User export/deletion.
- Monitoring and budget alerting.
- Retention and backup procedures.
Acceptance: unauthorized access tests and operational runbook reviewed.

Phase 3 — Android:
- Expo application.
- Shared API client/contracts.
- Sign-in, chat, history and account settings.
Acceptance: signed APK smoke-tested on multiple Android versions; AAB build reproducible; no secret embedded in app bundle.

Phase 4 — controlled beta and launch:
- Invite-only beta, abuse monitoring and usage feedback.
- Review terms, privacy notice, provider terms and regional compliance.
- Google Play listing, app content declarations and required testing.
Acceptance: production readiness checklist signed off; deploy production only through documented release approval.

## 10. Branch and release policy

- main: production; no direct feature work.
- develop: staging integration.
- feature/global-ai-platform-foundation: initial planning and implementation branch.
- Use focused feature branches thereafter.
- Open PRs into develop; wait for CI and staging acceptance.
- Promote develop to main only with explicit approval.
- Never change production service branch or deployment configuration automatically as part of this work.

## 11. First implementation tasks

1. Inventory current web routes, existing auth, AI endpoints and deployment behavior.
2. Identify whether current main backend is enabled in production and confirm real runtime environment variables outside the repository.
3. Define chat API contract and ownership rules.
4. Add conversation persistence without changing reports/datasets.
5. Add provider adapter tests and usage accounting.
6. Add quota enforcement and spend kill switch.
7. Create Expo app in apps/android after API contract stabilises.
8. Build CI for web, server and Android project.
9. Produce release notes and staged deployment checklist.

## 12. Explicit non-goals

- No edits to main in the initial implementation.
- No production deployment from the feature branch.
- No credential provisioning, payment setup or paid infrastructure activation.
- No removal of existing InsightBoard modules.
- No claim that a build passes without running it.
- No public launch before security, privacy and cost controls are operational.
