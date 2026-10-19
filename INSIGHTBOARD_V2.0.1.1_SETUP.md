# InsightBoard V2.0.1.1 — Experimental Lab Branch

This branch belongs to the existing InsightBoard repository. It is intentionally separate from main. It is not merged or intentionally deployed, so the current public demo remains the reference version.

## Included in this version

- Smart data checks (local): missing-value detection, possible duplicate detection, and invalid values in columns currently classified as numeric. Duplicate scanning is capped at 10,000 rows to keep large imports responsive.
- Gemini summaries: an authenticated Supabase Edge Function sends a bounded aggregate snapshot (KPIs, selected filters, field names, category summaries, selected time aggregates and completeness) rather than the raw imported row array.
- Language choices for summaries: English, Telugu, Hindi, Tamil, Bengali, Marathi, Kannada, Malayalam and Urdu.
- Secure team access: Supabase email/password signup and signin.
- Saved report history: per-user saved snapshot of dataset name, record count, selected filters, aggregate metrics and optional AI summary; raw imported rows are not saved by this feature.
- Row-level security: PostgreSQL policies restrict report history so users can access only rows whose user_id matches their authenticated ID.
- Production isolation: Vercel branch deployment is marked disabled in vercel.json for this feature branch. Verify Vercel Git settings before merging; do not use the feature branch as a production deployment.
- Smoke-test workflow: GitHub Actions runs the frontend build for changes on this branch.

## Honest limitations

- AI summary, signup/signin, and report history require a Supabase project and a Gemini API key configured as an Edge Function secret. They stay disabled until setup. Adding files to GitHub does not create cloud resources.
- The V2 panel's controls have English, Hindi and Telugu UI strings. Summary output offers nine language choices; the rest of the original dashboard is not fully translated in this increment.
- Google Calendar integration is not implemented; it remains future scope.
- The Gemini feature uses aggregate values, but dataset/category labels can still be sensitive. Do not send confidential, personally identifiable, customer, employee, regulated, or commercially sensitive information to a free-tier AI API.
- An AI summary is an aid, not a verified financial report. Check figures against the source/export before relying on them.

## Architecture

Existing React/Vite app -> Supabase Auth -> Supabase PostgreSQL (saved_reports, protected by RLS) and authenticated Supabase Edge Function -> Gemini Developer API.

Only a browser-safe Supabase publishable/anon key belongs in VITE_* variables. Never commit a Supabase service-role key or Gemini API key. Gemini's key belongs in Supabase Function Secrets.

## Free-tier research (reviewed 19 October 2026)

Plan details and eligibility change. Check current conditions before activation.

- Supabase Free: public limits documentation lists a 500 MB database, up to 50,000 monthly active users, 1 GB storage and 500,000 Edge Function invocations. Free resources have restrictions and usage caps; there is no lifetime guarantee. See https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-on-supabase.
- Gemini API: the default model is gemini-3.5-flash-lite; Google's current model page lists it as stable and the pricing page lists a free tier for eligible use. Free tier has limited access/rate quotas and Google may use free-tier prompt content to improve products. See https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite and https://ai.google.dev/gemini-api/docs/pricing.
- GitHub Student Developer Pack: offers vary by region, student eligibility and partner availability. Current Pack listing includes a standard .TECH domain free for one year and limited registrar offers (including selected Name.com domains and a one-year Namecheap .me offer). This is not lifetime-free; check renewal price before activating. See https://education.github.com/pack/.
- Azure for Students: eligible students may receive $100 Azure credit for 12 months plus limited free services, without a credit card. This is not a guarantee that an entire production backend will be free forever. Services can be disabled after credits are exhausted unless changed to a paid arrangement. See https://azure.microsoft.com/en-us/free/students/.
- Vercel: production deployment is not configured by this branch; Vercel branch auto-deployment is intended to be skipped for this branch. Check Vercel Git settings before any later activation.

## Setup — do this only when you choose to activate the V2 cloud features

No cloud resource has been created by this branch. The existing website uses no dedicated database/backend and remains unchanged.

1. Create a free Supabase project at https://supabase.com. Choose a strong project password and save it privately.
2. In Supabase Project Settings, copy the Project URL and publishable key (or legacy anon key). The publishable/anon key is the only Supabase key the browser app should receive.
3. Clone/download this feature branch locally, copy .env.example to .env.local, then fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
4. Install the Supabase CLI using its official method. Link the project and apply supabase/migrations/202610190001_v2_saved_reports.sql (commonly supabase link then supabase db push).
5. In Supabase Dashboard -> Edge Function Secrets, add GEMINI_API_KEY. Never use VITE_GEMINI_API_KEY, and never paste the key into GitHub code.
6. Deploy the Edge Function using the Supabase CLI: supabase functions deploy gemini-summary.
7. For production, set APP_ORIGIN as a server-side function secret/environment variable to your final site origin so CORS is restricted to that domain. Local development may require a different origin.
8. Run npm install, then npm run build. Test signup/login, Gemini summaries, RLS isolation with two test accounts, report save/list/delete, language output, mobile layout and all existing import/chart/export features.
9. Do not put sensitive real data into the Gemini feature until its data-use policy, consent process, and organisational requirements have been reviewed.

## Local behavior without credentials

If no .env.local exists, the original dashboard and V2 local data-quality checks still work. Supabase auth, saved cloud history and Gemini summaries display a setup state and stay disabled. No API key, database or account has been created automatically.

## One-click merge later

When ready, open the feature branch: https://github.com/Dipayanhaldar/insightboard-dual-dataset/tree/feature/insightboard-v2.0.1.1. Use Contribute -> Open pull request to compare feature/insightboard-v2.0.1.1 into main. Review changed files and the Actions build, then merge only after approval. Merging will update the production-connected main branch and may trigger Vercel deployment—so do not merge until ready.
