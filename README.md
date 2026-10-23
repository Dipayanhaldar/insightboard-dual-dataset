# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard with an optional V2 backend prototype.

## Current dashboard features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing records/data, plus CSV files. Imported records replace the currently active dataset.
- Dynamic categorical filters, KPI cards, six chart panels, and searchable, sortable, paginated records table.
- Light/dark themes; CSV, Excel and PDF exports; preset logo assets and Metro announcement audio.
- Stage 2 Voice Studio: Gnani Prisma v2.5 speech-to-text and Timbre v2.5 text-to-speech, with personal BYOK plus a separately capped site-managed option.
- AI API Provider Hub: personal-key text/chat generation for OpenAI, Anthropic Claude, Google Gemini, xAI Grok, Mistral AI, DeepSeek, Groq, Cohere, OpenRouter and Together AI.

## V2 backend (feature branch only)
The feature/insightboard-v2.0.1.1 branch adds Node.js + Express, MongoDB account/report storage, and a Render deployment blueprint. It does not modify main.
- User account and report APIs are served by the same Express service as the built React website.
- MongoDB stores account credentials as password hashes and private aggregate report snapshots.
- Raw imported dataset rows remain in the browser and are not uploaded to InsightBoard.
- Gemini remains browser-side Bring Your Own Key; never commit your key or share it with other users.
- Hosting and Atlas resources are not provisioned automatically by this repository.

**Gnani has two separate modes.** Personal BYOK uses each visitor's own key. Optional site-managed mode uses `GNANI_API_KEY` from Render and is limited to 10 requests per public IP per UTC day plus 25 total site requests per UTC day by default; limits are stored in MongoDB and the route fails closed if quota storage is unavailable. Site mode still incurs usage against the owner's Gnani account, so set provider-side budget controls too. Never commit credentials.

**The AI API Provider Hub uses BYOK.** Provider keys are held in browser session storage and forwarded to the selected provider for a request. InsightBoard does not store those keys in MongoDB. The hub supports text/chat calls only; it is not a complete integration of every provider's audio, image, video, embedding or fine-tuning APIs. Model IDs, availability and pricing can change; see the links in the hub and setup guide.

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
