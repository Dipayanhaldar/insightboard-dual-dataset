# InsightBoard V2.0.2 — backend and MongoDB setup

This feature branch contains a React/Vite + Node.js/Express + MongoDB application. It remains separate from main. No Render service, MongoDB cluster, domain, or other account resource has been created by this code change.

## What changed

- React dashboard and its existing dataset imports, filters, KPIs, charts, table, exports and Metro assets remain in place.
- Added a Node.js + Express API served from the same origin as the built React app.
- Added MongoDB-backed user accounts and report history. Passwords are hashed; each user can access only their own reports.
- Saved reports store a whitelisted aggregate snapshot: field names, filters, numeric summaries, category/time aggregates, completeness and optional Gemini summary. Raw imported rows are not sent to the InsightBoard backend or stored in MongoDB.
- Account tokens are kept in browser session storage and expire after 8 hours by default. Closing the tab/session may require signing in again.
- API rate limiting, password length validation, JWT verification, request size limits, a health endpoint and per-account report limits are included.
- The Gemini panel remains Bring Your Own Key (BYOK): the browser calls Google directly. The Gemini key is not stored on the InsightBoard backend. Use your own key, keep it private, and do not upload confidential data to Google.
- render.yaml describes one free Render web service that builds the frontend and runs the API from the same origin. It does not contain MongoDB credentials.

## Proposed free-hosted architecture

- GitHub: source code and the isolated feature branch.
- Render Free Web Service: serves the React website and runs the Express API. Public URL with custom-domain support.
- MongoDB Atlas Free cluster: persists accounts and saved aggregate reports independently of your laptop.
- GitHub Student Pack .TECH domain: optional; register separately, then attach it to Render.

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

### 3. Optional .TECH domain

1. Claim an eligible domain through https://education.github.com/pack/; partner availability and eligibility can change.
2. Register a name that is available, such as insightboard.tech.
3. After the Render service exists, add the domain in service settings and follow Render's DNS instructions. Render manages TLS certificates and HTTPS for connected custom domains.
4. Do not change the current production Vercel domain or DNS records. Attach only the newly registered domain to the V2 Render service.

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

- Do not paste database passwords, JWT secrets or Gemini keys into ChatGPT or commit them to GitHub.
- Password hashes, not plaintext passwords, are stored in MongoDB. Tokens expire after eight hours.
- Saved reports are scoped by user ID and contain aggregate values rather than raw rows. The backend sanitizes snapshots against a whitelist of fields.
- The Gemini feature sends the active dashboard's limited aggregate snapshot directly from the browser to Google's API only after the user requests a summary and confirms consent.
- main has not been edited or merged. Review this feature branch and a green CI build before deciding whether to provision, deploy or merge anything.
