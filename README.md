# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard designed for Vercel deployment.

## Current features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing `records` / `data`, plus CSV files. An **Imported Data** selection appears only after a file has been loaded.
- Imported records replace the currently active dataset; they are not merged with built-in presets.
- URL, link, href and hyperlink fields are hidden from the dashboard fields, filters, charts, table and exports.
- Dynamic categorical filters, KPI cards, six chart panels, and searchable, sortable, paginated records table.
- Light mode by default, with a dark-mode toggle. The selected appearance is remembered in the current browser.
- Export filtered records as CSV or Excel (`.xlsx`).
- Export the visible chart panels as images inside a PDF, followed by a filtered-data table (up to 1,000 rows and the first 12 fields for readable PDF layout).
- Responsive import and chart controls for smaller screens.
- Preset logo assets and an optional user-provided dataset logo for the current browser session.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Run `npm run build` to verify a production build.

## Phase 2: Gemini assistant, saved summaries, and Calendar reminders

The assistant uses a Vercel serverless function (`/api/gemini.js`) so the Gemini API key is never placed in browser JavaScript or committed to GitHub. When the user checks the data-sharing acknowledgement, the request sends aggregate metrics and up to 15 sample records.

### Required Vercel environment variables
Add these in Vercel → Project → Settings → Environment Variables, then redeploy:
- `GEMINI_API_KEY`: create in Google AI Studio and keep server-side.
- `INSIGHTBOARD_APP_PASSWORD`: strong, unique shared access password for the prototype's AI/report endpoints.
- `INSIGHTBOARD_SESSION_SECRET`: long random secret used to sign temporary HTTP-only sessions.
- `GEMINI_MODEL` (optional): defaults to `gemini-3.8-flash`.

The shared password is prototype access control, not individual user accounts. The normal dashboard remains usable when AI secrets are not configured; API endpoints fail closed until setup is complete.

### Optional saved report history (Azure Cosmos DB for NoSQL)
Create an Azure Cosmos DB account and enable Free Tier if offered at account creation. Create database `insightboard` and container `reports` with partition key `/ownerId`. Free tier currently covers the first 1,000 RU/s and 25 GB on eligible provisioned-throughput accounts; usage beyond those limits may be charged, and serverless accounts aren't eligible for this specific free-tier offer. Configure an Azure budget/alert.

Add these Vercel variables:
- `AZURE_COSMOS_ENDPOINT`: account endpoint URL.
- `AZURE_COSMOS_KEY`: account key (secret; never add to GitHub).
- `AZURE_COSMOS_DATABASE`: `insightboard` or your database name.
- `AZURE_COSMOS_CONTAINER`: `reports` or your container name.

Saved history contains AI summary, prompt, dataset name, timestamp and aggregate metrics. Raw uploaded records are not saved. All users who know the shared prototype password can see the same saved report history.

### Google Calendar
The reminder action opens a pre-filled Calendar draft for tomorrow at 9:00 AM (Asia/Kolkata). The user must review and press Save. This isn't automatic account access; direct API insertion for each user requires a separate Google OAuth / Calendar API setup.

### Data note
The built-in Hyderabad Metro data is station-reference data, not live train-position or service-status information. Imported files are processed in the browser and are not uploaded to a server by default.

### Cost and safety
- Never commit API keys, Cosmos DB keys, or secrets to GitHub.
- Use the lowest-cost eligible options, set budget alerts, and monitor usage. Student credits may expire and aren't a lifetime guarantee.
- After setting variables, redeploy Vercel and test sign-in, one Gemini question, saving a summary and loading history.
