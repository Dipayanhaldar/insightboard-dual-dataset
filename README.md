# InsightBoard

**A browser-based data exploration and comparison workspace.** Import CSV or JSON datasets, inspect metrics and visualisations, compare datasets, and export useful results.

<p align="center">
  <a href="https://insightboard-college-dipayan.onrender.com"><strong>🌐 Launch InsightBoard</strong></a>
  ·
  <a href="https://github.com/Dipayanhaldar/insightboard-dual-dataset"><strong>GitHub repository</strong></a>
  ·
  <a href="https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53"><strong>Project documentation</strong></a>
</p>

![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)

## Overview

InsightBoard turns structured files into an interactive dashboard. It is designed for people who want to explore data visually without building charts or writing queries themselves.

**Core capabilities**
- Import CSV and JSON datasets.
- Automatically inspect fields and generate KPI cards and chart visualisations.
- Search, filter, sort and browse records in a data table.
- Compare a second dataset while keeping the primary dataset separate.
- Review row counts, shared field names, numeric averages and category counts.
- Export supported results as CSV, Excel or PDF.
- Switch between light and dark themes.

The built-in Hyderabad Metro content is station-reference data. It does not represent live train locations, arrival predictions or service status.

## Use InsightBoard

1. Open the [InsightBoard website](https://insightboard-college-dipayan.onrender.com).
2. Import a CSV or JSON file from your device, or explore the available reference data.
3. Use filters and search to focus on relevant records.
4. Review the KPI cards, charts and records table.
5. Export the results using the available export controls.

To compare datasets, open the comparison workspace and add a second CSV or JSON file.

### Supported input

- **CSV:** the first row is interpreted as column headings.
- **JSON:** use an array of record objects, or an object containing a `records` or `data` array.
- **Comparison limits:** up to 20 MB and 50,000 rows per comparison file in the browser.
- **Field matching:** comparison uses exact field names. It does not automatically map differently named columns or perform relational joins.

## Technology

| Area | Technologies | Purpose |
| --- | --- | --- |
| Frontend | React 18, Vite 6, JavaScript | Application interface and client-side workflows |
| Charts and UI | Recharts, Lucide React | Data visualisation and interface icons |
| Data import/export | SheetJS (`xlsx`), jsPDF, jsPDF-AutoTable, html2canvas | Spreadsheet and PDF workflows |
| Backend foundation | Node.js 22+, Express 4 | API and server-side routes |
| Data persistence | MongoDB Atlas, Mongoose | Account and report data in the backend feature set |
| API protection | Helmet, express-rate-limit, bcryptjs, jsonwebtoken | Security headers, rate limiting, password hashing and signed sessions |
| Browser AI | `@mlc-ai/web-llm`, WebGPU, Web Worker | Local model inference in the AI feature track |
| Speech | Web Speech API and provider-backed speech workflows | Browser narration and voice features |
| CI | GitHub Actions | Automated validation and build workflows |
| Hosting | Render | Web application hosting |

The repository's Node engine range is `>=22 <25`. The frontend build uses Vite and outputs production assets to `dist/`.

## AI and voice development

InsightBoard's AI work includes two distinct approaches:

- **Instant Client-Side AI:** Qwen2.5 0.5B Instruct through `@mlc-ai/web-llm`, WebGPU and a dedicated worker. The model processes a bounded dashboard summary. Initial model setup requires a connection and may download substantial model assets.
- **Custom Key Mode:** a Bring Your Own Key (BYOK) provider workflow. Users supply their own supported provider credentials and are subject to that provider's limits and charges.
- **Narration:** browser-native Web Speech API, depending on the voices available on the device.
- **Voice workflows:** provider-backed speech features, depending on service configuration and availability.

WebGPU support and available memory vary by device and browser. Local model inference is not guaranteed on every system. AI and voice features are developed in separate feature tracks; their availability depends on the version deployed.

## Latest development highlights

The recent project work has focused on:

- **Release foundation:** consolidating the application structure and preparing the public-facing release.
- **Dataset scope:** removing an unused third-party dataset integration and keeping the application aligned with its intended data workflows.
- **PWA readiness:** improving the offline application shell and expanding production asset precaching and validation.
- **Offline reliability:** adding checks that verify the production asset graph required for offline use.
- **Store preparation:** aligning the app identity and preparing listing and release-checklist material.
- **Infrastructure planning:** documenting a free-first hosting approach, conservative database connection-pool settings and scalability milestones.
- **AI and voice exploration:** maintaining separate work for local AI, BYOK and narration instead of presenting every prototype as part of the same release.

These updates improve release discipline, reduce unused integrations, strengthen offline readiness and make the product's deployment boundaries clearer. The [commit history](https://github.com/Dipayanhaldar/insightboard-dual-dataset/commits/main) contains the source-level change record.

## Branch and feature boundaries

The repository contains multiple development tracks. The presence of a feature on a branch does not automatically mean it is included in the deployed website.

| Development track | Focus |
| --- | --- |
| `main` | Default-branch dashboard and dual-dataset foundation |
| `feature/college-project-blackcoffer` | Dashboard release line with AI, BYOK, narration and related V2 work |
| `feature/global-ai-platform-foundation` | AI platform and integration foundation |
| `feature/insightboard-v2.0.1.1` | Backend/API and account/report prototype |
| `feature/microsoft-store-release-prep` | PWA and Microsoft Store preparation |

Review the [branches](https://github.com/Dipayanhaldar/insightboard-dual-dataset/branches) and [commit history](https://github.com/Dipayanhaldar/insightboard-dual-dataset/commits/main) for implementation details.

## Run locally

### Requirements

- Git
- Node.js 22 or newer, below 25
- npm
- MongoDB configuration only for backend account/report functionality

### Install and start the frontend

```bash
git clone https://github.com/Dipayanhaldar/insightboard-dual-dataset.git
cd insightboard-dual-dataset
npm install
npm run dev
```

Open the local URL printed by Vite.

### Build and validate

```bash
npm run build
npm run check:server
npm test
```

### Optional API development

The backend feature set uses Express and MongoDB. Configure the required environment values locally using the project's example configuration. Keep real credentials out of source control.

```bash
npm run dev:api
```

Run the API and Vite frontend in separate terminals. The development proxy routes `/api` requests to the local API on port 3001.

## Privacy and security

- The dual-dataset comparison workflow processes comparison rows in browser memory.
- V2 account/report functionality uses authenticated, account-scoped routes; saved reports are aggregate snapshots rather than copies of imported source files.
- AI and speech provider workflows may send the information needed for the requested operation to the selected external provider.
- BYOK users are responsible for their own provider credentials, quotas and charges.
- Backend security components include security headers, rate limiting, password hashing and signed sessions.

These describe implementation choices, not an independent security certification. Never commit environment files, database connection strings, JWT secrets, API keys, access tokens, private account data or user datasets.

## Project resources

- [Launch InsightBoard](https://insightboard-college-dipayan.onrender.com)
- [GitHub repository](https://github.com/Dipayanhaldar/insightboard-dual-dataset)
- [Main source branch](https://github.com/Dipayanhaldar/insightboard-dual-dataset/tree/main)
- [All branches](https://github.com/Dipayanhaldar/insightboard-dual-dataset/branches)
- [Commit history](https://github.com/Dipayanhaldar/insightboard-dual-dataset/commits/main)
- [GitHub Actions](https://github.com/Dipayanhaldar/insightboard-dual-dataset/actions)
- [Product roadmap](docs/PRODUCT_ROADMAP.md)
- [PWA and Store release checklist](docs/MICROSOFT_STORE_PWA_RELEASE.md)
- [Public project dossier — Notion](https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53)
- [Architecture and data model — Notion](https://app.notion.com/p/401a0f05cdd2812eb46ce221ffbb6f41)
- [Developer handover and release notes — Notion](https://app.notion.com/p/401a0f05cdd2816f9da6ceafe5ad24f2)
- [QA evidence and acceptance — Notion](https://app.notion.com/p/401a0f05cdd281e2b7cee85282653da0)
- [User journeys — Notion](https://app.notion.com/p/401a0f05cdd281d6b513fc3a89406c5c)

---

<p align="center">
  <a href="https://insightboard-college-dipayan.onrender.com"><strong>Launch InsightBoard ↗</strong></a>
  ·
  <a href="https://app.notion.com/p/406a0f05cdd280c09762fef99e5c5d53"><strong>Project documentation ↗</strong></a>
  ·
  <a href="https://github.com/Dipayanhaldar/insightboard-dual-dataset/issues"><strong>Report an issue ↗</strong></a>
</p>
