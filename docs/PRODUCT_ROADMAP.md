# InsightBoard — Product Roadmap

Status: active planning document  
Product direction: data intelligence first, AI-assisted analysis second, collaboration and mobile after the core workflow is reliable.  
Budget policy: free-first; no paid infrastructure or site-funded AI spend without explicit approval.

## Product positioning

InsightBoard should become a workspace where people can bring business, operational, public or research datasets; understand data quality; compare sources; discover changes; create defensible reports; and ask an AI analyst to explain evidence.

Do not compete as a generic chatbot. The differentiator is a complete data-to-decision workflow with transparent calculations, reproducible reports and privacy-aware AI.

## Release track

### Release 2.0.2-beta.2 — Dual-dataset comparison
- [x] Preserve the active dashboard dataset while loading a separate comparison dataset.
- [x] Accept CSV and JSON comparison files in the browser.
- [x] Match exact shared field names and identify comparable numeric fields.
- [x] Compare row counts, shared schema, numeric averages and exact category distributions.
- [x] Export the numeric comparison summary to CSV.
- [x] Keep raw comparison rows in browser memory; do not upload them through this feature.
- [ ] Verify mobile layout, large-file behavior, build and existing account/report regression tests.
- [ ] Complete staging smoke tests against the deployed Render service.

Known limits: 20 MB file size and 50,000 rows per comparison file; exact field-name matching only; averages and exact category counts are descriptive, not statistical significance tests. No joins, fuzzy field mapping, causal claims or automatic schema transformations.

### Milestone 1 — Data preparation and trustworthy analytics
Priority: highest after this release.
- Guided schema mapping when two files use different column names.
- Join and append workflows with explicit key selection, join preview and duplicate warnings.
- Data cleaning: missing-value rules, type conversion, trim/normalise, deduplication and reversible transformation steps.
- Data profiling: distributions, outliers, invalid values, uniqueness, completeness and quality score.
- Better comparison methods: median, percentiles, growth rates, variance, cohort and period-over-period comparisons.
- Statistical checks with assumptions and sample sizes visible; never label simple differences as causal findings.
- Saved analysis configurations that can be reopened without silently persisting raw source rows.

Definition of done: users can import two real files, map columns, preview changes, run a comparison, understand the calculation and export a reproducible report.

### Milestone 2 — Report Studio and reusable workspaces
- Multi-step report builder with narrative, KPI cards, charts, tables and source metadata.
- Save, duplicate, rename, reopen and delete reports with strict per-user ownership checks.
- PDF, CSV and XLSX exports with report metadata and generation timestamp.
- Reusable dataset presets and analysis templates.
- Optional report sharing with expiring links and explicit access scopes.
- Scheduled reports only after a reliable background-job mechanism exists.

Definition of done: a report reopened on another device renders the same aggregate result and does not expose another user's data.

### Milestone 3 — AI Analyst
- Server-side provider adapter contract and allowlisted model registry.
- Conversation create/list/rename/archive/delete and paginated message history.
- Streaming responses, cancellation, timeouts and normalized provider errors.
- Read-only analysis tools first: schema inspection, aggregate queries, comparison explanation and report drafting.
- Evidence-linked answers: show which fields, filters, row counts and calculations support a claim.
- Preserve BYOK; never store provider keys in MongoDB or log them.
- Explicit consent before sending user data to a provider.
- Usage ledger, per-user/IP quotas, output caps, monthly hard spend ceiling and kill switch before any site-funded key is enabled.

Definition of done: AI cannot silently change source data, every quantitative statement can be traced to an actual calculation, and usage/cost limits are enforced server-side.

### Milestone 4 — Documents and knowledge
- Document upload, text extraction, page-level citations and searchable project knowledge.
- Malware/type/size checks, retention controls and user deletion.
- Object storage for files; metadata and ownership in MongoDB.
- Vector search only after access-control filtering and deletion semantics are proven.
- Keep document retrieval separate from raw-dataset analytics and clearly cite source passages.

Do not start a large RAG pipeline before file storage, tenant isolation, retention and deletion are reliable.

### Milestone 5 — Android
- Separate Expo/React Native app in apps/android.
- Shared HTTPS API and authentication lifecycle.
- Sign-in, analytics overview, dataset/report access, AI conversations and settings.
- Native file picker, upload progress, safe-area and keyboard handling.
- Reproducible signed APK for testing and AAB for Play Store.
- Do not fork business logic between web and Android; share API contracts and validation rules.

### Milestone 6 — Production platform and scale
- Shared/distributed rate limiting; in-memory per-process limits are not sufficient across instances.
- Background queue for long-running imports, exports and AI jobs.
- Object storage for large files and generated artifacts.
- Database backups with tested restore drills, indexes and retention policies.
- Structured logs, request IDs, metrics, error tracking, uptime alerts and incident runbooks.
- Load tests with stated traffic profiles and measured latency/error budgets.
- Autoscaling and multi-region failover only after shared state, session strategy, health checks and traffic routing are designed and tested.
- CDN/static asset caching and a documented deployment rollback procedure.

Render free instances are not a high-availability or high-traffic architecture. Do not promise automatic cross-host traffic failover, unlimited users or unlimited free AI. Start with one authoritative Render deployment path and add capacity only when measured load and budget justify it.

## Product metrics

Track:
- Time from first visit to first successful analysis.
- Percentage of users who load a second dataset and complete a comparison.
- Comparison/report export completion rate.
- Returning users and saved-report reopen rate.
- Import failure rate and analysis error rate.
- AI cost per active user, quota rejection rate and provider failure rate.
- P50/P95 API latency and service error rate.

Avoid vanity metrics such as raw page views without activation or retention context.

## Non-negotiable release gates

1. Existing dashboard, presets, filters, charts, exports, theme, Voice Studio, AI Provider Hub, accounts and saved reports still work.
2. No raw data, credentials or personal API keys are added to logs or committed to Git.
3. Every database read/write enforces the authenticated owner/tenant.
4. Every new data workflow has validation, loading, empty, error and retry states.
5. Mobile viewport and keyboard behavior are tested.
6. CI build and automated tests pass.
7. Render staging is smoke-tested before any production promotion.
8. Production main, the Stage 2 branch and existing production services remain untouched until separately approved.


## Infrastructure readiness — balanced, free-first
- [x] Add configurable bounded MongoDB pool settings with conservative defaults.
- [x] Add API request correlation IDs and privacy-conscious request metadata logs.
- [x] Add graceful shutdown handling for Render process termination.
- [x] Document the staged scaling architecture, current free-tier limits and no-paid-resource policy in [SCALABLE_INFRASTRUCTURE_PLAN.md](SCALABLE_INFRASTRUCTURE_PLAN.md).
- [ ] Complete staging database/auth configuration and user-journey smoke tests.
- [ ] Complete cross-user authorization tests before public multi-user promotion.
- [ ] Implement shared rate limiting and shared storage only when a free, reliable option is selected or paid-resource approval is explicitly granted.
