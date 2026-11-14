# InsightBoard VDB (Visual Dashboard) — `v3.0.0`

**InsightBoard VDB (Visual Dashboard)** is an enterprise-ready **Shopping Mall Management, Retail Sales Intelligence, and Schema-Aware Visual Dashboard** platform built with React 18, Vite, Recharts, Python 3 Scientific Analytics, and Node.js/Express.

Designed for both **corporate operations (Shopping Mall Directors, Retail Leasing Managers, Sales Analysts)** and **offline field/mall environments**, InsightBoard VDB transforms raw JSON, CSV, POS exports, and live webhooks into an interactive command center powered by **INSI (`insi.ai`)** — an autonomous 3D robot mascot and voice-guided executive data operator.

---

## Synchronized Multi-Platform Version (`v3.0.0`)

All connected surfaces share the same semantic release version and are validated automatically in CI/CD:

| Platform / Surface | Version | Status / Package Identifier |
| :--- | :--- | :--- |
| **Web Application (PWA & Browser)** | `v3.0.0` | Displayed in top badge, sidebar, Release Center & footer |
| **Backend API (`/api/version`)** | `v3.0.0` | Synchronized via `package.json` & `public/release-info.json` |
| **Microsoft Store Windows App** | `3.0.0.0` | Store ID: `9N20PQ3BJRSG` (`InsightBoard VDB`) |
| **Android APK Package** | `v3.0.0` | Automated Gradle/Capacitor APK (`InsightBoard-VDB-v3.0.0.apk`) |

---

## Version History & Feature Matrix (What Each Version Includes)

### `v3.0.0` — INSI (`insi.ai`) Autonomous Voice Operator & Separated 3-Mode Universal Connector (Current Release)
- **Hands-Free `"Hey INSI"` Wake-Word & Phonetic STT Operator**: Recognizes `"Hey INSI"` and phonetic browser Speech-to-Text transcriptions (`"Hey NC"`, `"Hey in C"`, `"Hey insi"`, `"Hey easy"`, `"Hey insight"`), executes multi-step dashboard commands, and speaks concise replies ($\le 35$ words) via browser TTS.
- **Separated 3-Mode Universal Connector Hub (`UniversalConnectorHub.jsx`)**:
  - **Mode A (`demo_sandbox`)**: Instant offline-ready Shopping Mall & Retail and Hyderabad Metro Rail sandboxes.
  - **Mode B (`file_upload`)**: Drag-and-drop CSV/JSON ingestion for POS, ERP, SAP, Tally, and Shopify exports with automatic fuzzy column mapping (`gross_sales` $\leftrightarrow$ `revenue`, `tenant_name` $\leftrightarrow$ `store`, `visitor_count` $\leftrightarrow$ `footfall`).
  - **Mode C (`api_webhook`)**: Live REST/Webhook feed fetcher (auto-extracting nested arrays like `data.stores`) + **External OpenAPI 3.1 Bridge (`GET /api/connector/openapi.json` & `POST /api/connector/analyze`)** so ChatGPT Custom GPT Actions, Claude, Gemini, or corporate webhooks can query InsightBoard VDB without opening the browser UI.
- **3D Reference-Matched `insi` Robot Mascot (`InsiPetBot.jsx`)**: Non-verbal expressive 3D white & metallic-blue robot with cognac-brown pedestal armchair, `101` laptop, stack of books, Magician Stick on data import, Quantum AI Core on heavy AI tasks, and Studio Equalizer Deck on audio playback.
- **Usage & Quotas Zero-Billing Governance (`UsageQuotasPanel.jsx`)**: Live consumption monitoring and `Limit Reached` cutoff protection for Google Gemini API, Supabase Cloud, MongoDB Atlas, and Microsoft Azure.

### `v2.1.0` — Commercial Retail & Shopping Mall Command Center
- **Renamed to InsightBoard VDB (Visual Dashboard)**: Unified branding across Web, API, Microsoft Store PWA manifest, and Android APK.
- **Warm Corporate Light & Dark UI**: Replaced the cold, dark-locked interface with a high-contrast, warm corporate slate & sapphire design system supporting both **Light Mode** and **Dark Mode** with tabular numeric alignment (`tabular-nums`).
- **Shopping Mall & Retail Sales Command Center (`#retail-command-center`)**:
  - Built-in **Shopping Mall & Retail Sales Flagship Portfolio** dataset (`16` anchor & specialty tenants across `6` mall zones: *Atrium Ground, Level 1 North/South, Level 2 East, Level 3 Food & Cinema, Level 4 Family Zone*).
  - Automatic calculation of **Total Portfolio Revenue**, **Space Productivity Yield (`₹ / sq.ft`)**, **Footfall-to-Checkout Conversion Funnel**, **Rent-to-Revenue Coverage Ratio**, and **Target Attainment %**.
  - **Interactive What-If Scenario Simulator**: Real-time sliders for *Mall Footfall Campaign Lift (`-20%` to `+40%`)*, *Checkout Conversion Lift (`-15%` to `+30%`)*, *Promotional Discount Impact (`0%` to `25%`)*, and *Lease Rent Revision (`-15%` to `+20%`)* with live projected revenue delta.
  - **Zone & Tenant Space Productivity Matrix**: Visual bar chart comparing zone revenue vs. space efficiency (`₹/sq.ft`) and automated managerial action cards (*Underperforming Target Recovery*, *High-Footfall Conversion Gap*, *Rent Coverage Stress Alert*, *Anchor Expansion Signal*).
- **Lifetime-Free Server AI Summary & Retail Optimization (`/api/ai/summary` & `/api/ai/optimize`)**:
  - Powered by server-side Google Gemini (`@google/genai`) when `GEMINI_API_KEY` is configured on the host, paired with an **always-on, lifetime-free server-side analytical engine fallback** so every user gets structured executive summaries and 5-point retail optimization plans with **zero personal API keys required**.
- **Email & Password Account Access**:
  - Saved report history uses the existing email/password registration and sign-in endpoints. Google sign-in endpoints are disabled; no email supplied by a client can be used to mint an account session.
- **Automated Microsoft Store PWA + Android APK CI/CD (`.github/workflows/release-windows-store-and-apk.yml`)**:
  - Automatically validates the PWA build, compiles a downloadable `.apk` (`InsightBoard-VDB-v2.1.0.apk`), generates/submits the Microsoft Store Partner Center package update, and publishes both artifacts to **GitHub Releases**.

### `v2.0.2-beta.2` — Dual-Dataset Comparison & Release Center
- **Dual-Dataset Comparison (`#dataset-compare`)**: Upload a secondary CSV or JSON file to compare record count deltas, schema field overlaps, category shifts, and numeric metric differences side-by-side.
- **Release Center**: In-app version inspector comparing frontend runtime, backend `/api/version`, and Microsoft Store package status.
- **Microsoft Store PWA Foundation**: Offline fallback (`public/offline.html`), service worker caching (`public/sw.js`), and build verification scripts (`scripts/validate-pwa.mjs`, `scripts/validate-pwa-build.mjs`).

### `v2.0.1.1` — V2 AI Workspace, Multi-Language & Voice Studio
- **V2 AI Workspace**: Multilingual UI and executive summary generation (*English, Hindi, Telugu, Bengali, Tamil, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu*).
- **Gnani Voice Studio**: Server-managed text-to-speech synthesis with browser speech fallback and daily quota tracking.
- **Multi-Provider AI Hub**: Architecture registry for comparing AI provider capabilities and cost profiles.
- **Account Report History**: JWT-authenticated report snapshot saving with MongoDB persistence and automatic in-memory fallback when MongoDB is not configured.

### `v1.0.0` — Core Schema-Aware Visual Dashboard
- **Dynamic CSV & JSON Import**: Automatic detection of numeric metrics, categorical dimensions, and date/month fields from any uploaded file.
- **6 Synchronized Recharts Panels**: Primary Metric by Category, Time-Series / Category Distribution, Top Categories, Numeric Field Summary, Category Totals, and Record Completeness.
- **Multi-Format Exports**: One-click export of filtered records to **CSV**, **Multi-Sheet Excel (`.xlsx`)**, and **Landscape A4 PDF + 6 Rendered Charts**.
- **Hyderabad Metro Reference Preset**: Built-in station dataset with interactive audio announcement playback.

---

## Native MCP Connector (Feature Branch)

InsightBoard VDB is being extended with a native **Model Context Protocol (MCP)** endpoint using Streamable HTTP. The implementation is isolated on `feature/mcp-connector-v3` and is not part of the production release until reviewed and merged.

- Endpoint after deployment: `https://YOUR-EXISTING-API-HOST/api/mcp`
- Initial tools: connector capabilities, analysis of caller-supplied JSON records, and analysis of the built-in public mall sample dataset.
- Permissions: read-only; no saved-report access, database writes, or external side effects.
- Cost model: deterministic INSI analytics; no paid AI provider API calls.
- Limits: 2,500 input records per request and up to 100 returned detail rows.
- Deployment: reuse the existing Express API service and GitHub-driven deployment; no new hosting service is required.

See [MCP Connector Documentation](docs/MCP_CONNECTOR.md) for transport, data handling, and client setup details.

---

## Local Development & Production Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional — Works Out-of-the-Box Without Secrets)
Copy `.env.example` to `.env`. All variables are optional; the server automatically provides portable in-memory persistence, lifetime-free analytical AI fallback, and portable Google SSO when external credentials are omitted:
```bash
cp .env.example .env
```

### 3. Run Full-Stack Server (Express API + Vite Frontend on Port 3000)
```bash
npm run dev
```

### 4. Run Validation & Unit Tests
```bash
npm run check:pwa
npm test
npm run build
npm run check:pwa:build
```

---

## Automated Microsoft Store & Android APK Release Pipeline

The workflow `.github/workflows/release-windows-store-and-apk.yml` runs automatically on pushes to `main`, version tags (`v*`), or manual dispatch (`workflow_dispatch`):

1. **Web & PWA Verification (`validate-and-build-web`)**: Verifies that `package.json` and `public/release-info.json` share the exact same version (`2.1.0`), runs unit tests, builds `dist/`, and validates offline service worker assets.
2. **Android APK Packaging (`build-android-apk`)**: Wraps the production `dist/` bundle using Capacitor Android + Gradle and outputs `InsightBoard-VDB-v2.1.0.apk`.
3. **Microsoft Store Auto-Update (`microsoft-store-update`)**: Generates `windows-store-package-config-v2.1.0.json` and—when Microsoft Partner Center credentials (`MSSTORE_TENANT_ID`, `MSSTORE_CLIENT_ID`, `MSSTORE_CLIENT_SECRET`, `MSSTORE_SELLER_ID`) are configured in GitHub Secrets—automatically packages and publishes the update to Microsoft Store (`9N20PQ3BJRSG`).
4. **GitHub Release Publishing (`publish-github-release`)**: Creates a tagged GitHub Release with release notes, the installable `.apk`, and the Windows Store submission manifest attached.

---

## Future Monetization Readiness

InsightBoard VDB `v2.1.0` is structured so future commercial tiers (such as multi-mall portfolio benchmarking, automated tenant billing exports, scheduled WhatsApp/Email executive digests, or enterprise SSO) can be toggled cleanly via user account roles in `/api/auth/*` without breaking the lifetime-free core analytics workflow.


## Google sign-in (Firebase Authentication)

InsightBoard's account panel supports both the existing email/password flow and Google sign-in through Firebase Authentication.

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Google**. Configure the OAuth client ID and client secret in the Firebase provider settings, not in frontend source code.
2. Under **Authentication → Settings → Authorized domains**, add the production Vercel domain and any custom domain used by the website.
3. The backend verifies Firebase ID tokens against Google's published signing certificates before issuing the existing InsightBoard API session. No OAuth client secret or Firebase service-account private key is required in Vercel environment variables for this verification flow.
4. The project ID defaults to `banded-field-nbcxw`. Set `FIREBASE_PROJECT_ID` in the deployment environment only if the Firebase project changes. The existing `JWT_SECRET` requirement for InsightBoard API sessions remains unchanged.

Google sign-in does not replace or remove email/password accounts. A Google account must return a verified email address.
