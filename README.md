# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard with an optional V2 backend prototype.

## Current dashboard features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing records/data, plus CSV files. Imported records replace the currently active dataset.
- Dynamic categorical filters, KPI cards, six chart panels, and searchable, sortable, paginated records table.
- Light/dark themes; CSV, Excel and PDF exports; preset logo assets and Metro announcement audio.
- Stage 2 Voice Studio: Gnani Timbre v2.5 text-to-speech using personal Bring Your Own Key (BYOK). Site-managed voice keys are not used; dataset summaries in Voice Studio are local and rule-based.
- AI API Provider Hub: personal-key text/chat generation for OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Mistral AI, DeepSeek, Groq, Cohere, OpenRouter and Together AI.

## V2 backend (feature branch only)
The feature/insightboard-v2.0.1.1 branch adds Node.js + Express, MongoDB account/report storage, and a Render deployment blueprint. It does not modify main.
- User account and report APIs are served by the same Express service as the built React website.
- MongoDB stores account credentials as password hashes and private aggregate report snapshots.
- Raw imported dataset rows remain in the browser and are not uploaded to InsightBoard.
- Gemini remains browser-side Bring Your Own Key; never commit your key or share it with other users.
- Hosting and Atlas resources are not provisioned automatically by this repository.

**Gnani Voice Studio is BYOK-only.** Each visitor supplies their own Gnani API key; the TTS endpoint accepts that key per request and does not fall back to a Render-managed Gnani key. Voice generation does not require an InsightBoard sign-in. Keys are not intentionally persisted by InsightBoard; avoid using keys on shared/public devices. Provider usage and charges belong to the key owner. Local browser speech preview, where available, is device/browser-dependent and is not a guarantee of offline playback.

**The AI API Provider Hub uses BYOK.** Provider keys are held in browser session storage and forwarded to the selected provider for a request. InsightBoard does not store those keys in MongoDB. The hub supports text/chat calls only; it is not a complete integration of every provider's audio, image, video, embedding or fine-tuning APIs. Model IDs, availability and pricing can change; see the links in the hub and setup guide.


## Android app and GitHub releases

The project includes Capacitor Android packaging. The Android app bundles the Vite frontend and calls the existing Express API on Render using `VITE_API_BASE_URL`; MongoDB remains on the configured MongoDB Atlas connection. The native app does not host a second backend or database.

- App ID: `com.dipayan.insightboard`
- Capacitor web output: `dist`
- Android debug build is checked by GitHub Actions on feature-branch pushes.
- Every stable version tag (`vMAJOR.MINOR.PATCH`) triggers a signed APK build and publishes the APK plus SHA-256 checksum to GitHub Releases.
- Configure the four Android signing secrets before the first release. See [ANDROID_RELEASE_AUTOMATION.md](./ANDROID_RELEASE_AUTOMATION.md).
- The release workflow verifies that production Render API/database health and Android CORS are ready. It never deploys Render.

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
