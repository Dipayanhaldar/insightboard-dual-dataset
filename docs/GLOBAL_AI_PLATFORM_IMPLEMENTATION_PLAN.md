# Global AI Platform — Implementation Work Items

This file converts the product blueprint into reviewable work.

## Epic 0 — Baseline and repository safety
- [ ] Record current main commit and dependency baseline.
- [ ] Verify package scripts, CI checks, and deployment target.
- [ ] Inventory frontend routes and API endpoints.
- [ ] Inventory environment-variable usage and confirm no secrets are committed.
- [ ] Document staging smoke-test steps for existing InsightBoard functionality.

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
