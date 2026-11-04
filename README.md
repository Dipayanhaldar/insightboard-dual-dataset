# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard designed for Vercel deployment.

## Current features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing `records` / `data`, plus CSV files.
- Imported records replace the currently active dataset; they are not merged with built-in presets.
- URL, link, href and hyperlink fields are hidden from charts, filters, tables and exports.
- Dynamic filters, KPI cards, chart panels, and searchable/sortable/paginated records table.
- Export filtered records as CSV or Excel (`.xlsx`).
- Export visible chart panels plus a filtered data table to PDF.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` to verify production build.

## Serverless AI + auth prototype notes

This project includes Vercel serverless endpoints for shared-password authentication, Gemini requests, and optional Cosmos report history.

### Security and privacy warning (important)
- The shared password is **prototype-only** access control.
- All authenticated users share one fixed project owner partition for saved report history.
- This is **project-wide shared history**, not per-user isolation.
- Do **not** use sensitive, confidential, personal, regulated, or proprietary data.

### Gemini data-sharing behavior
- `/api/gemini` can send aggregate metrics and selected sample records/context to Gemini.
- Treat all dataset/context/history values as untrusted prompt data.
- Redact or remove sensitive fields before using AI features.
- Prefer opt-in/acknowledged sharing behavior before sending sample records.

### Throttling and production hardening limits
- Login and Gemini abuse controls are best-effort in-memory serverless limiters.
- These controls are **per instance** and not globally consistent across all serverless instances.
- Production use should add external identity, centralized rate limiting, monitoring, and auditing.

## Required Vercel environment variables
Set in Vercel → Project → Settings → Environment Variables, then redeploy:
- `INSIGHTBOARD_APP_PASSWORD` (required for protected endpoints)
- `INSIGHTBOARD_SESSION_SECRET` (required for signed sessions)
- `GEMINI_API_KEY` (required for `/api/gemini`)
- `GEMINI_MODEL` (optional, default: `gemini-3.8-flash`)

Optional Cosmos history:
- `AZURE_COSMOS_ENDPOINT`
- `AZURE_COSMOS_KEY`
- `AZURE_COSMOS_DATABASE` (optional, default: `insightboard`)
- `AZURE_COSMOS_CONTAINER` (optional, default: `reports`)

The frontend can still run without these backend secrets; protected API endpoints fail closed until required secrets are present.

## Cost and safety
- Never commit API keys or secrets.
- Set provider budgets/alerts for Gemini and Cosmos usage.
- Validate deployment behavior after each secret or config update.
