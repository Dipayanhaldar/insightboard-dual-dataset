# InsightBoard — Dynamic Dataset & Export Update

Vite + React application designed as a browser-based data exploration dashboard and deployed to Vercel.

## Current features
- Import JSON arrays/records/data or CSV files. New imports replace the active dataset.
- Detect available fields and build dataset-appropriate filters, KPI cards, charts and table columns.
- Preset datasets: synthetic sample records, Blackcoffer public JSON and Hyderabad Metro station-reference JSON.
- Export filtered records to CSV and Excel; export a PDF containing visible chart panels and a filtered table (up to 1,000 rows and the first 12 columns).
- Responsive dashboard, searchable/sortable/paginated table, permanent preset logos and click-to-play Metro announcement.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Run `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` to check a production build.

## Phase 2: Gemini assistant, saved summaries, and Calendar reminders

The assistant uses a Vercel serverless function (/api/gemini.js) so the Gemini API key is never placed in browser JavaScript or committed to GitHub. When the user checks the data-sharing acknowledgement, the request sends aggregate metrics and up to 15 sample records. Do not upload confidential or personal records to an external AI service.

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

Saved history contains AI summary, prompt, dataset name, timestamp and aggregate metrics. Raw uploaded records are not saved. All users who know the shared prototype password can see the same saved report history; do not store confidential business data here.

### Google Calendar
The reminder action opens a pre-filled Calendar draft for tomorrow at 9:00 AM (Asia/Kolkata). The user must review and press Save. This isn't automatic account access; direct API insertion for each user requires a separate Google OAuth / Calendar API setup.

### Cost and safety
- Never commit API keys, Cosmos DB keys, or secrets to GitHub.
- Use the lowest-cost eligible options, set budget alerts, and monitor usage. Student credits may expire and aren't a lifetime guarantee.
- After setting variables, redeploy Vercel and test sign-in, one Gemini question, saving a summary and loading history.
