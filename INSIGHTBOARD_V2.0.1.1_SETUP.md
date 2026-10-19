# InsightBoard V2.0.1.1 — Browser-only Lab Branch

This branch stays in the existing InsightBoard repository and remains separate from main. It is not merged or deployed. The current production site is unchanged.

## What this branch adds

- Local data-quality checks: missing values, possible exact duplicates and non-numeric values in detected numeric columns. Checks are capped at the first 10,000 rows for responsiveness.
- Gemini summaries from a limited aggregate snapshot of the active dashboard. Raw rows are not sent by this feature.
- Summary output languages: English, Telugu, Hindi, Tamil, Bengali, Marathi, Kannada, Malayalam and Urdu. V2 panel controls have basic English, Hindi and Telugu labels. The rest of the dashboard is not fully translated yet.
- An API key input in the UI. The key is never hardcoded in code or sent to an InsightBoard backend. By default, the saved key is held in this browser tab session; optional Remember saves it in this browser's local storage. Forget removes the browser-stored key.
- Saved report history stored locally in this browser (up to 20 aggregate snapshots). It is not cloud-synced, not account-protected, and does not include raw imported rows.
- Existing imports, dynamic filters, KPI cards, six charts, table sorting/pagination and CSV/Excel/PDF exports are retained.
- Vercel auto-deployment is configured to skip this feature branch. Check Vercel's Git settings before activation.
- GitHub Actions build check for the V2 branch.

## No InsightBoard backend or database

Supabase, database migrations, serverless functions, cloud authentication and the Supabase client have been removed from this branch. No database or server is created or connected.

Gemini still runs as an external Google API because an AI model must be called somewhere. In this version, the visitor's browser calls Google directly using the API key they enter. There is no private shared key embedded in the repo, and no InsightBoard proxy. This is a bring-your-own-key demo, not a secure shared-key production architecture.

IMPORTANT: never send your API key to ChatGPT, commit it to GitHub, paste it into source code, or set it as a VITE_ variable. The browser-only approach cannot keep an entered key secret from the browser environment. If you want everyone to use your one shared key without entering their own, a server-side proxy is required and that would reintroduce backend/cloud infrastructure.

## Generate a Gemini API key

1. Open https://aistudio.google.com/apikey and sign in to Google AI Studio.
2. If prompted, accept Google's terms and choose/create a project as prompted.
3. Click Create API key. New AI Studio keys are currently created as authorization keys by default.
4. Keep the key private. If available for that key, restrict use to the Gemini API and restrict website origins to your actual domain. A restriction limits misuse but does not make a browser-shared key equivalent to a server secret.
5. Open your deployed InsightBoard or local demo, paste the key into the Gemini API key field, and click Use key in this browser. Leave Remember unchecked to store only for this browser tab session. Check Remember only if you want it saved in local storage on this device.
6. Select a summary language, read the data-sharing acknowledgement, tick the checkbox, and click Generate Gemini summary.
7. Click Forget key when finished, especially on shared computers.

Google's security guide explicitly says not to expose API keys client-side in production and recommends a backend proxy for securing a shared application key. The UI therefore uses BYOK and warns users not to use a shared owner key: https://ai.google.dev/gemini-api/docs/api-key

## Free tier and data-use note (reviewed 19 October 2026)

Google lists Gemini 3.5 Flash-Lite (model ID gemini-3.5-flash-lite) as stable and available with free-tier options, subject to account/model availability and quota limits. Free-tier prompts may be used to improve Google products. Don't send confidential, personally identifiable, customer, employee, regulated or commercially sensitive data. Check current pricing and terms before use: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite and https://ai.google.dev/gemini-api/docs/pricing

No Supabase/Azure account, database, billing plan or separate hosting service has been configured by this branch. Creating a Gemini API key does involve Google AI Studio and its associated project/key setup, but no InsightBoard database/backend is needed for this BYOK demo.

## Local behavior and merge steps

- Without an API key, the existing dashboard and local data checks still work; the AI summary button stays unavailable until a key is supplied and consent is checked.
- Local history and optional remembered key are stored in the browser's storage for this site only. They do not follow the user to another device/browser and are not a secure team history.
- The key is sent from the browser to Google directly when Generate is clicked. The only data sent is the aggregate snapshot and category/field labels, not raw row objects.
- To activate later: open https://github.com/Dipayanhaldar/insightboard-dual-dataset/tree/feature/insightboard-v2.0.1.1, click Contribute -> Open pull request, set base to main, review the diff and successful build, then merge when approved. Merging to main can trigger the existing Vercel production deployment.

Google Calendar reminders, secure multi-user accounts, centrally saved reports and using one shared secure API key remain out of scope for this no-backend version.
