# Microsoft Store PWA / MSIX release checklist

Proposed Microsoft Store display name: **InsightBoard VDB By Dipayan**

## Current implementation on the feature branch

- Web app manifest: `/manifest.webmanifest`
- App identity: `InsightBoard VDB By Dipayan`
- Start URL and scope: same-origin root
- Standalone display mode
- Theme and background colors
- Raster PNG app icons at 192x192 and 512x512, plus scalable SVG fallback
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


## Continuous release and version policy

InsightBoard tracks three independent versions:

- **Website version**: the React/Vite frontend release. Routine frontend, styling, analytics and feature releases are deployed to the website origin and normally flow to installed Store PWAs at next launch/refresh.
- **API version**: the backend compatibility release. Keep APIs backward-compatible for the supported client window; introduce additive fields/routes before removing or changing existing contracts.
- **Windows package version**: the MSIX/AppX package version. Increment and submit a new package when manifest metadata is changed (for example app name, icons or manifest capabilities) or Windows package identity/capabilities change. A normal frontend or service-worker code update does not normally require a Store package resubmission.

Microsoft documents that PWA frontend and service-worker changes are downloaded from the web server when users next launch the app, while manifest changes require a new Store package because manifest data is copied into the Windows package: https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/microsoft-store

### Release Center in the app

- Displays runtime website/API version and build commit when the API is reachable.
- Displays latest published website release notes from `/release-info.json`.
- Separately tracks the Windows package version; this remains "not generated" until a package is built and tested.
- Offers a manual status refresh and a user-initiated reload when release metadata indicates a newer website version.
- Never silently reloads while a user may be editing data.
- Does not cache the release metadata or API version response.

### Release operator checklist

For every website/API release:
1. Update `package.json` version and `public/release-info.json` website/API versions together.
2. Add concise, user-facing notes and update the release date.
3. Preserve the current Windows package version unless a package-level change is made.
4. Deploy to staging, verify API `/api/version`, then approve the production release separately.
5. Confirm the Release Center shows the deployed version and commit.

For a Windows package release:
1. Review manifest and package identity diffs.
2. Increment the four-part Windows package version in the release metadata and package configuration generated by PWA Builder.
3. Generate and install-test both package formats as required by the current Store flow.
4. Submit the new package through Partner Center only after user approval.
