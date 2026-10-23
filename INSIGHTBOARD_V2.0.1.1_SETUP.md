# InsightBoard V2.0.2 — backend and MongoDB setup

This feature branch contains a React/Vite + Node.js/Express + MongoDB application. It remains separate from main. No Render service, MongoDB cluster, domain, or other account resource has been created by this code change.

## What changed

- Added a Gnani Voice Studio for text-to-speech (Timbre v2.5, MP3 download) and speech-to-text (Prisma v2.5, short audio-file transcription) with authenticated, rate-limited server proxy routes. The Gnani API key remains in Render environment variables.

- React dashboard and its existing dataset imports, filters, KPIs, charts, table, exports and Metro assets remain in place.
- Added a Node.js + Express API served from the same origin as the built React app.
- Added MongoDB-backed user accounts and report history. Passwords are hashed; each user can access only their own reports.
- Saved reports store a whitelisted aggregate snapshot: field names, filters, numeric summaries, category/time aggregates, completeness and optional Gemini summary. Raw imported rows are not sent to the InsightBoard backend or stored in MongoDB.
- Account tokens are kept in browser session storage and expire after 8 hours by default. Closing the tab/session may require signing in again.
- API rate limiting, password length validation, JWT verification, request size limits, a health endpoint and per-account report limits are included.
- Gemini AI summaries support two modes: a site-managed key stored only in Render (backend proxy with request limits), or optional BYOK where a user enters their personal key and the browser calls Google directly. A personal key is stored only in the user's browser if they choose to save it; it is never sent to the InsightBoard backend. BYOK browser calls expose that key to anyone who can inspect that browser session, so the UI warns users to use a private device and a Gemini-restricted key. In both modes, only a sanitized aggregate snapshot is sent for analysis; raw imported rows are not sent.
- render.yaml describes one free Render web service that builds the frontend and runs the API from the same origin. It does not contain MongoDB credentials.

## Proposed free-hosted architecture

- GitHub: source code and the isolated feature branch.
- Render Free Web Service: serves the React website and runs the Express API. Public URL with custom-domain support.
- MongoDB Atlas Free cluster: persists accounts and saved aggregate reports independently of your laptop.
- Purchased .ME domain: attach it to the V2 Render service after entering the exact registered domain and applying the DNS records Render displays.

Neither your laptop being open nor any files stored on your laptop are required after successful online deployment. The website and data depend on Render and MongoDB Atlas being available.

## Free-tier limitations to know before creating anything

- Render free web services sleep after 15 minutes without inbound traffic. They wake on the next request, commonly taking about a minute. They may restart, and local filesystem changes are not durable. This app does not store report data on Render's filesystem; MongoDB stores it.
- Render provides 750 free instance hours per workspace per calendar month. A single continuously active 24/7 service is roughly 720 hours in a 30-day month, leaving little room for other free services. Sleeping services do not consume instance hours. Bandwidth and build-pipeline limits also apply. If no payment method is on file and a free quota is exceeded, Render disables services instead of charging beyond included usage. Do not add billing details just to start this demo.
- Atlas Free clusters never expire, but storage is limited to 0.5 GB, 100 read/write operations per second, 500 concurrent connections, and one free cluster per project. Atlas may automatically pause an idle free cluster after 30 days with zero connections. It is a small app/demo tier, not a production SLA or backup plan.
- Render outbound IP ranges are shared by services in the same region. The instructions use those ranges for Atlas network access instead of exposing the database to all IP addresses.
- Free hosting means best-effort availability, not guaranteed instant response or production uptime. Plans and limits can change.

Sources checked on 19 October 2026:
- Render free service limits: https://render.com/docs/free
- Render Blueprint configuration and generated secrets: https://render.com/docs/blueprint-spec
- MongoDB Atlas Free cluster limits: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- MongoDB Atlas Free cluster setup: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/
- Render outbound IP ranges: https://render.com/docs/outbound-ip-addresses
- Render custom domains: https://render.com/docs/custom-domains

## Accounts and setup needed before deployment

Do these only when ready to provision. No credentials are needed in this chat.

### 1. MongoDB Atlas account and free database

1. Open https://www.mongodb.com/cloud/atlas/register and sign in.
2. Create a project for InsightBoard V2.
3. Create one Free cluster (M0), choosing a nearby supported region.
4. Under Database Access, create a dedicated database user with a strong random password. Do not reuse your account login password.
5. Under Network Access, allowlist the outbound CIDR ranges for the Render region selected in render.yaml. Render explains how to obtain the ranges here: https://render.com/docs/outbound-ip-addresses. After the service exists, verify them in Render Dashboard → service → Connect → Outbound. Use every range shown for that region. Do not use 0.0.0.0/0 unless you consciously accept allowing connections from any IP. If you create the service before finishing this step, the web process can deploy in a degraded state; after updating Atlas network access, manually restart/redeploy the service so it reconnects.
6. Choose Connect → Drivers → Node.js and copy the connection string. Replace only the database-user placeholders and URL-encode any reserved characters in both the username and password if needed. Keep the Atlas-provided slash/database path as generated (normally `/` before the query string); do not change it to `/insightboard_v2`. The app selects `insightboard_v2` via `MONGODB_DATABASE` and explicitly authenticates against Atlas's default `admin` authentication database. Store the final URI only in Render's environment settings or local `server/.env`; never commit it.

### 2. Render account and service

1. Open https://dashboard.render.com/register.
2. Connect your GitHub account and authorize access to Dipayanhaldar/insightboard-dual-dataset.
3. Create a Blueprint from this repository and choose branch feature/insightboard-v2.0.1.1. Review the plan and confirm the preview contains exactly one free web service from this branch, never main.
4. Render prompts for MONGODB_URI during setup; enter your Atlas connection string. JWT_SECRET is generated randomly from render.yaml. Do not replace it with a public or committed value.

#### If Render reports `bad auth: authentication failed`

1. In Atlas → Database & Network Access → Database Access, check the **database user** used in the URI. This is not your Atlas website login email.
2. If unsure of the password, edit that database user and reset it, or create a dedicated user for the application. Save the new password securely.
3. Copy Atlas's Node.js connection string again and replace the username/password placeholders exactly. Make sure no angle brackets or placeholder text remain.
4. If the username or password contains URI-reserved characters such as `$ : / ? # [ ] @`, percent-encode them in the URI. To avoid encoding mistakes, you can set a long, strong password containing letters and numbers only, then update the URI.
5. Use the host name for the same Atlas cluster where the database user was created. Do not change Atlas's URI path to `/insightboard_v2`; the app chooses that data database separately and explicitly authenticates using `admin`.
6. In Render → Environment, replace `MONGODB_URI` with the corrected full URI and save. Restart/redeploy after the code update and environment update.

Never paste the live URI, password, or JWT secret into ChatGPT or commit them to GitHub.
5. Review the plan and billing screen. Keep the service on Free; do not approve a paid plan or add billing details just to make this demo run.
6. Automatic deployments are off initially. Manual deploys let you decide when updates from this feature branch are published.

### 3. Gemini server key (needed for AI summaries)

1. Open https://aistudio.google.com/app/apikey and create a Gemini API key for your project.
2. In Render, open the V2 web service you intend to keep, then Environment.
3. Add `GEMINI_API_KEY` and paste the value directly into Render. Do not put the key in source code, GitHub, the browser, or this chat. Leave `GEMINI_MODEL` set to `gemini-3.5-flash-lite` unless you intentionally select another supported model.
4. Save the environment change and deploy/restart that V2 service. Visit `/api/ai/status` on its public URL; it should return `available: true`. A successful status means the key exists, not necessarily that quota/billing is ready; test by generating one summary.
5. Watch Google AI Studio's usage/quota and configure billing controls if your use case requires them. Keep the key restricted to the Gemini API when the key type supports that restriction.

### 4. Gnani voice key: personal BYOK and optional site-managed mode

Voice Studio exposes two separate routes so personal keys remain independent from the site owner's key.

**Personal-key BYOK**
1. Each person obtains an API key from their own Gnani account and checks that account's quota/pricing.
2. In InsightBoard, open Voice Studio, choose **Personal key (BYOK)**, paste the key, then select **Use key in this session**.
3. The key is held in that browser session and forwarded over HTTPS for that user's authenticated request. InsightBoard does not store or log the key in MongoDB or GitHub.
4. Select **Forget key** when finished, especially on shared devices.

**Site-managed Gnani mode (uses the owner's key)**
1. The Stage 2 Render service must have the owner key already configured as environment variable `GNANI_API_KEY`. Keep the actual value only in Render's Environment settings; never place it in GitHub, a React/Vite variable, or this chat.
2. In Voice Studio, choose **Site key · 10/IP/day**. Public requests can be made without an InsightBoard sign-in.
3. Shared usage is limited to **10 requests per IP per UTC day**, combined across TTS and STT, plus a second **25 requests site-wide per UTC day** cap by default. Change the global cap only by configuring `GNANI_SITE_DAILY_GLOBAL_LIMIT` in Render. The IP quota is stored as a keyed hash in MongoDB, not as a raw IP address; quota state survives ordinary server restarts.
4. The route fails closed if MongoDB quota storage is unavailable. Site-mode speech is capped at 1,000 characters per request and transcription uploads at 6 MB. Gnani may impose additional endpoint/account limits.
5. These controls reduce exposure but cannot guarantee zero billing: people can rotate networks, and a successful request still uses the owner's Gnani account. Enable provider-side usage/budget alerts or hard spending controls where available and check Gnani's current plan/terms before inviting public use.
6. Verify `/api/voice/site-status` on the deployed Stage 2 origin. It should report whether site mode is configured and the active caps. A positive status proves that an environment key is present, not that its quota or validity is confirmed. Test with a short sample and check provider usage.

Both modes send submitted text or audio to Gnani for processing. InsightBoard does not save generated audio or submitted recordings to MongoDB.

### 5. AI API Provider Hub: ten-provider BYOK

The provider hub is a curated, **non-ranked** selection of ten widely used text/chat APIs. It does not claim to be an objectively ranked global top ten, and it does not implement every modality each provider offers.

| Provider | Official API/model documentation |
|---|---|
| OpenAI | https://developers.openai.com/api/reference/overview · https://developers.openai.com/api/docs/models |
| Anthropic Claude | https://platform.claude.com/docs/en/api/overview · https://platform.claude.com/docs/en/models/overview |
| Google Gemini | https://ai.google.dev/api · https://ai.google.dev/gemini-api/docs/models |
| xAI Grok | https://docs.x.ai/developers/rest-api-reference/inference/chat-completions |
| Mistral AI | https://docs.mistral.ai/api/endpoint/chat |
| DeepSeek | https://api-docs.deepseek.com/api/responses · https://api-docs.deepseek.com/quick_start/pricing/ |
| Groq | https://console.groq.com/docs/api-reference · https://console.groq.com/docs/models |
| Cohere | https://docs.cohere.com/v2/reference/chat |
| OpenRouter | https://openrouter.ai/developers · https://openrouter.ai/pricing |
| Together AI | https://docs.together.ai/reference/chat-completions · https://docs.together.ai/docs/serverless/models |

How to use:
1. Open **AI API Provider Hub**, select a provider, and follow its **Get API key** link.
2. Paste your personal key and select **Use key in this session**. Choose a model ID accepted by your account, edit the prompt, then run it.
3. The key is stored in browser session storage and sent to InsightBoard over HTTPS with each request. The backend only accepts the fixed provider IDs listed above and forwards the key for that request; it does not persist or log the key. BYOK text requests are rate-limited to 30 per IP per hour as an abuse guard.
4. Provider calls are billed, credited or quota-limited under the account attached to that key. Check the provider's current pricing and usage limits before use. Some providers require paid credits or model-level access. Use a small prompt/output limit while testing.
5. Current model IDs are examples and change frequently. A provider may reject a model because it is retired, unavailable on your plan, or unsupported for chat completions. Verify the model ID in that provider's live catalog. The hub supports text/chat only; audio, speech, image/video generation, embeddings, fine-tuning and agent tools require separate endpoint integrations.

Existing Gemini dashboard BYOK and Gnani personal BYOK remain in place as separate features. The hub's provider-specific keys are stored separately per provider, in session storage.

### 6. Purchased .ME domain: connect

For the current steps, see [INSIGHTBOARD_ME_DOMAIN_SETUP.md](INSIGHTBOARD_ME_DOMAIN_SETUP.md). The domain itself has already been purchased. Add the exact registered .ME domain under Settings → Custom Domains on the selected V2 Render service, copy the DNS records shown by Render into your domain registrar, then verify the domain in Render and wait for HTTPS provisioning. The exact domain name is required before DNS settings can be finalized. Do not change the current production Vercel domain or GitHub `main` branch.

## Local development

1. Install Node.js 22 or newer within the supported package range.
2. At the repository root, run npm install.
3. Copy server/.env.example to server/.env and add your own Atlas URI plus a strong random JWT_SECRET.
4. Start the API in one terminal: npm run dev:api.
5. Start the frontend in another terminal: npm run dev. Vite proxies /api requests to Express on port 3001.
6. Visit the local Vite address. Create an account, sign in, save a report and verify it remains after refreshing or signing in from another browser.
7. Run npm run check:server and npm run build.

## Test before inviting users

1. Open /api/health on the deployed site and confirm it reports status: ok and database: true.
2. Create a test account, save an aggregate snapshot, refresh, delete it and sign out.
3. Create a second account and verify it cannot see the first account's reports.
4. Confirm a Render restart does not remove saved reports.
5. Registration is public. This beta has rate limiting but does not yet include email verification, password reset or CAPTCHA. Do not treat this beta as a high-stakes production service until those operational features and backups are added.

## Safety and data behavior

- Do not paste database passwords, JWT secrets, Gemini keys, or Gnani keys into ChatGPT or commit them to GitHub.
- Password hashes, not plaintext passwords, are stored in MongoDB. Tokens expire after eight hours.
- Saved reports are scoped by user ID and contain aggregate values rather than raw rows. The backend sanitizes snapshots against a whitelist of fields.
- The Gemini feature sends the active dashboard's aggregate snapshot only after the user requests a summary and confirms consent. In site-managed mode, the Express backend sends it to Google with a server-side key; in BYOK mode, the browser sends the aggregate snapshot directly to Google. Raw imported rows are not sent.
- main has not been edited or merged. Review this feature branch and a green CI build before deciding whether to provision, deploy or merge anything.
