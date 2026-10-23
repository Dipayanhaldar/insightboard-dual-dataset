# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard with an optional V2 backend prototype.

## Current dashboard features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing records/data, plus CSV files. Imported records replace the currently active dataset.
- Dynamic categorical filters, KPI cards, six chart panels, and searchable, sortable, paginated records table.
- Light/dark themes; CSV, Excel and PDF exports; preset logo assets and Metro announcement audio.
- Stage 2 Voice Studio: Gnani Prisma v2.5 speech-to-text and Timbre v2.5 text-to-speech, behind authenticated, rate-limited Express routes.

## V2 backend (feature branch only)
The feature/insightboard-v2.0.1.1 branch adds Node.js + Express, MongoDB account/report storage, and a Render deployment blueprint. It does not modify main.
- User account and report APIs are served by the same Express service as the built React website.
- MongoDB stores account credentials as password hashes and private aggregate report snapshots.
- Raw imported dataset rows remain in the browser and are not uploaded to InsightBoard.
- Gemini remains browser-side Bring Your Own Key; never commit your key or share it with other users.
- Hosting and Atlas resources are not provisioned automatically by this repository.

**Gnani uses Bring Your Own Key (BYOK).** Each user enters their own Gnani API key in Voice Studio. The key is held in browser session storage and forwarded only for that user's authenticated request; it is not stored in MongoDB or logged by InsightBoard. Do not set a shared `GNANI_API_KEY` in Render or commit credentials. Users are responsible for usage charged to their Gnani account. See INSIGHTBOARD_V2.0.1.1_SETUP.md for setup and security notes.

## Run the frontend locally
1. Install Node.js 22 or newer.
2. Run npm install.
3. Run npm run dev.
4. Run npm run build.

## Run the V2 API locally
1. Copy server/.env.example to server/.env and supply a MongoDB Atlas URI plus a private JWT secret.
2. Run npm run dev:api in one terminal and npm run dev in another.
3. Vite proxies /api calls to Express at port 3001.

The built-in Hyderabad Metro data is station-reference data, not live train-position or service-status information.
