# InsightBoard

**A browser-based data exploration and comparison workspace.** Import CSV or JSON, inspect automatically discovered fields, explore metrics and charts, compare a second dataset, and export results.

[![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-not%20specified-lightgrey)](#project-status)

<p align="center">
  <a href="https://insightboard-college-dipayan.onrender.com"><strong>🌐 Open InsightBoard</strong></a>
  ·
  <a href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"><strong>Source code</strong></a>
  ·
  <a href="https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53"><strong>Project documentation</strong></a>
</p>

> **Deployment note:** The public project dossier records the college-project deployment as Live on **8 November 2026**, on commit `f6f8a91ddc7116833bf36aa2b055cfa3825d2495`. The two linked GitHub Actions runs for that commit passed. This is the last recorded deployment verification in the available project documentation; it is not a claim that a fresh live smoke test was run while editing this README.

## What you can do

- Import CSV files or JSON record arrays / objects containing a `records` or `data` array.
- Discover fields from the imported data and inspect KPI cards, six chart panels, filters and a searchable, sortable, paginated records table.
- Load a second CSV/JSON file into the dual-dataset comparison workspace without replacing the active dataset.
- Compare row counts, shared field names, numeric averages and exact category counts; export numeric comparison results.
- Switch between light and dark themes.
- Export supported dashboard results as CSV, Excel or PDF.
- Use the optional V2 account/report, voice and AI capabilities where the relevant branch and services are deployed and configured.

The built-in Hyderabad Metro content is **station-reference data**, not live train locations, arrival predictions or service-status information.

## Quick start — use the website

1. Open [InsightBoard](https://insightboard-college-dipayan.onrender.com).
2. Allow the website to finish loading. A free hosting instance may take time to wake after inactivity.
3. Import a CSV or JSON file from your device, or start with the supplied reference data.
4. Use filters and search to focus the records; inspect KPI cards, charts and the records table.
5. Export the result using the available export controls.

To compare two datasets, open the comparison workspace and add a second CSV/JSON file. The comparison file is held separately from the active dashboard dataset.

### File format

- **CSV:** the first row is used for column headings.
- **JSON:** provide an array of record objects, or an object containing a `records` or `data` array.
- **Comparison size limits:** up to 20 MB and 50,000 rows per comparison file in the browser.
- **Field matching:** comparison uses exact field names. It does not automatically map similarly named columns, join datasets or establish causal relationships.

## AI and voice capabilities

The project has explored two AI interaction modes in its V2 feature work:

- **Instant Client-Side AI:** a compact Qwen2.5 0.5B Instruct quantized model using `@mlc-ai/web-llm`, a dedicated web worker and WebGPU. The local summary uses a bounded aggregate snapshot from the dashboard rather than sending the complete raw record array to the local model. The first model load requires an internet connection and can download roughly 1 GB of model/runtime assets.
- **Custom Key Mode:** preserves the Bring Your Own Key (BYOK) provider workflow. Users supply their own supported provider credentials; provider quotas and any charges are theirs.
- **Narration:** the browser's native Web Speech API, subject to the voices installed and exposed by the current device/browser.
- **Voice Studio:** provider-backed speech workflows. Provider access, supported languages, quotas and credentials depend on the configured service.

**Compatibility:** WebGPU is not available on every browser/device, and a successful adapter check does not guarantee that the model will fit in memory or complete inference. Use Custom Key Mode or the dashboard's available fallback when local model initialisation is unsupported. Do not treat local AI, BYOK or voice capabilities as unlimited hosted services.

These features must be checked against the active deployed branch before assuming they are available on the public website. See [branch and release boundaries](#branches-and-release-boundaries).

## How the project is built

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React 18, Vite 6 | Dashboard interface and client-side workflow |
| Visualisation | Recharts, Lucide React | Charts and interface icons |
| File/export utilities | SheetJS (`xlsx`), jsPDF, jsPDF-AutoTable, html2canvas | Spreadsheet/PDF output and rendering |
| Backend in V2 work | Node.js 22+, Express 4 | HTTP API, account and report routes |
| Persistence in V2 work | MongoDB Atlas, Mongoose | Account records and saved aggregate report snapshots |
| API security in V2 work | Helmet, express-rate-limit, bcryptjs, jsonwebtoken | Security headers, rate limits, password hashing and signed sessions |
| Local AI in feature work | `@mlc-ai/web-llm`, WebGPU, Web Worker | Browser-side model inference |
| Narration | Web Speech API | Device/browser speech output |
| Delivery checks | GitHub Actions | Automated syntax, test and build checks |
| Hosting recorded in project dossier | Render | Public web deployment |

The current `package.json` defines the Node engine as `>=22 <25`. The default-branch application manifest includes React, Vite, Recharts, SheetJS, jsPDF, Express and MongoDB-related packages. Feature-only dependencies should not be assumed to be part of the public deployment.

## Run locally

### Requirements

- Git
- Node.js 22 or newer (below 25)
- npm
- MongoDB configuration only when running the account/report API functionality

### Frontend

```bash
git clone https://github.com/Dipayanhaldar/insightboard-dual-dataset.git
cd insightboard-dual-dataset
npm install
npm run dev
```

Open the local URL printed by Vite.

### Production build and checks

```bash
npm run build
npm run check:server
npm test
```

Available scripts are defined in [package.json](package.json). The build command creates the production frontend output in `dist/`.

### Optional API development

The repository's V2 API work uses Express and MongoDB. Configure private environment values locally using the relevant example file and deployment documentation; never put real credentials in source code, commits, screenshots or issue reports.

```bash
npm run dev:api
```

Run the API and Vite frontend in separate terminals. Vite is configured to proxy `/api` requests to the local API on port 3001. Database-backed endpoints require valid local configuration.

## Branches and release boundaries

This repository contains multiple development tracks. A Git branch is not proof of deployment.

| Track | Scope | Public availability |
| --- | --- | --- |
| `main` | Default-branch dashboard and dual-dataset comparison baseline | Source branch; check the deployment record above for the last recorded live revision |
| `feature/college-project-blackcoffer` | College-project release line documented with Instant Client-Side AI, Custom Key Mode, narration and V2 work | Deployment recorded Live on 8 Nov 2026 at commit `f6f8a91`; verify current host status before relying on it |
| `feature/global-ai-platform-foundation` | Release foundation and related integration work | Separate feature branch; do not assume it is deployed |
| `feature/insightboard-v2.0.1.1` | Earlier V2 backend/API and deployment prototype | Separate feature branch; not the same as the current default-branch runtime |
| `feature/microsoft-store-release-prep` | PWA / Microsoft Store preparation | Packaging work only; no Store package submission is claimed here |

The source history includes earlier V1 dashboard work, V2 backend/API prototypes, the dual-dataset comparison workspace, security/hosting experiments, and subsequent AI/voice/PWA feature tracks. Use the [repository commit history](https://github.com/Dipayanhaldar/insightboard-dual-dataset/commits/main) and [branches](https://github.com/Dipayanhaldar/insightboard-dual-dataset/branches) for the exact code chronology. The list above is a feature-track summary, not a promise that every branch was merged into `main`.

## Project documentation and useful links

- **[Open the deployed website](https://insightboard-college-dipayan.onrender.com)**
- **[GitHub repository](https://github.com/Dipayanhaldar/insightboard-dual-dataset)**
- **[Source code — main branch](https://github.com/Dipayanhaldar/insightboard-dual-dataset/tree/main)**
- **[All branches](https://github.com/Dipayanhaldar/insightboard-dual-dataset/branches)**
- **[Commit history](https://github.com/Dipayanhaldar/insightboard-dual-dataset/commits/main)**
- **[GitHub Actions](https://github.com/Dipayanhaldar/insightboard-dual-dataset/actions)**
- **[Product roadmap](docs/PRODUCT_ROADMAP.md)**
- **[Deployment / PWA release checklist](docs/MICROSOFT_STORE_PWA_RELEASE.md)**
- **[Full public project dossier — Notion](https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53)**
- **[Project architecture and data model — Notion](https://app.notion.com/p/401a0f05cdd2812eb46ce221ffbb6f41)**
- **[Developer handover and release notes — Notion](https://app.notion.com/p/401a0f05cdd2816f9da6ceafe5ad24f2)**
- **[QA evidence and acceptance — Notion](https://app.notion.com/p/401a0f05cdd281e2b7cee85282653da0)**
- **[Screen-by-screen user journeys — Notion](https://app.notion.com/p/401a0f05cdd281d6b513fc3a89406c5c)**

## Build verification

The project dossier records these successful GitHub Actions runs for commit `f6f8a91ddc7116833bf36aa2b055cfa3825d2495` on `feature/college-project-blackcoffer`:

- [InsightBoard CI — Validate and build](https://github.com/Dipayanhaldar/insightboard-dual-dataset/actions/runs/42475255823)
- [InsightBoard V2 branch build check](https://github.com/Dipayanhaldar/insightboard-dual-dataset/actions/runs/42475255836)

Both runs completed successfully on **8 November 2026**. CI success verifies only the checks configured in those workflows; it is not a substitute for device testing, third-party provider verification, penetration testing or a fresh production smoke test.

## Privacy and security notes

- The dual-dataset comparison feature is documented to process its comparison rows in browser memory and not upload those raw rows through that workflow.
- Account/report features in V2 use authenticated routes and account-scoped report queries; saved reports are aggregate snapshots, not backups of original imported files.
- AI provider and voice workflows can send the information required for a requested operation to the selected external provider. Review the in-product notice before submitting data.
- BYOK credentials remain the responsibility of the user supplying them. Do not use a personal API key on a shared device.
- API routes in the V2 work are configured for `Cache-Control: no-store`; security middleware and rate limits are included in the server implementation.
- These are implementation notes, not a security certification or independent penetration-test result.

**Never commit** environment files, MongoDB connection strings, JWT secrets, personal AI/voice API keys, user datasets, access tokens or private account data. Use hosting-provider secret settings for deployment credentials.

## Project status

InsightBoard is an evolving project with a browser-first dashboard and separately tracked feature/deployment branches. Not every documented prototype or planned milestone is guaranteed to be present on the public website at the same time.

For known limitations and the next planned milestones, see the [Product Roadmap](docs/PRODUCT_ROADMAP.md). For Store/PWA readiness and release gates, see the [Microsoft Store PWA release checklist](docs/MICROSOFT_STORE_PWA_RELEASE.md).

---

<p align="center">
  <a href="https://insightboard-college-dipayan.onrender.com"><strong>Launch InsightBoard ↗</strong></a>
  &nbsp;|&nbsp;
  <a href="https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53"><strong>Read the project dossier ↗</strong></a>
  &nbsp;|&nbsp;
  <a href="https://github.com/Dipayanhaldar/insightboard-dual-dataset/issues"><strong>Report an issue ↗</strong></a>
</p>
