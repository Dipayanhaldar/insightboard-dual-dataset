# Microsoft Store PWA / MSIX release checklist

Proposed Microsoft Store display name: **InsightBoard VDB By Dipayan**

## Current implementation on the feature branch

- Web app manifest: `/manifest.webmanifest`
- App identity: `InsightBoard VDB By Dipayan`
- Start URL and scope: same-origin root
- Standalone display mode
- Theme and background colors
- Scalable SVG app icon
- Service worker with a network-first navigation strategy and offline fallback
- API requests are deliberately excluded from service-worker caching
- Static assets under `/assets/` and `/icons/` use cache-first with network fill
- Privacy notice: `/privacy.html`

## Important limitations

- The offline page is a connectivity fallback, not offline analytics. Account, database, AI-provider and saved-report operations require the hosted service and/or their external providers.
- The service worker does not cache API responses, authentication responses, user datasets or private reports.
- The manifest currently uses a scalable SVG icon. Before generating a Store package, run PWA Builder's report card and add raster PNG icons (at minimum 192x192 and 512x512, plus maskable artwork) if its current Windows packaging validation requires them.
- No Windows MSIX bundle has been generated or signed in this repository.
- The proposed display name is not reserved until it is successfully reserved in Partner Center.
- The privacy notice must be reviewed against the final production data flows and populated with a real, monitored support contact before submission.

## Required release sequence

1. Confirm the Partner Center developer account and reserve the unique product name.
2. Obtain the exact Package ID, Publisher ID and Publisher display name from Partner Center > Product identity.
3. Configure and smoke-test the feature-branch staging backend, including MongoDB and JWT settings. Never place secrets in source control.
4. Run PWA Builder against the intended public HTTPS origin and resolve all required report-card action items.
5. Generate the Windows MSIX bundle and classic AppX bundle using the exact Partner Center identity values.
6. Install and test the generated package on a clean supported Windows environment. Verify launch, navigation, sign-in, imports, exports, saved reports, AI BYOK flows, links, and offline fallback.
7. Complete Store listing assets, category, pricing (free), markets, age rating, privacy URL and support contact.
8. Submit through Partner Center. Microsoft states certification can take up to three business days.

## Protected environments

- Work only on `feature/global-ai-platform-foundation` until explicitly approved.
- Do not merge PR #12, modify `main`, alter the production Render service, or modify Stage 2 as part of this preparation.
- Do not package the staging URL as the public Store app. The final package must point at the approved production origin after production readiness and release approval.
