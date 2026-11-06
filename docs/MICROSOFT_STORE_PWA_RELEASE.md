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


## Package audit — uploaded candidate (7 November 2026)

The uploaded `InsightBoard.zip` was inspected as an archive. It contains:
- `InsightBoard.msixbundle` (identity `DipayanHaldar.InsightBoardVDB`, publisher `CN=D9ADEC2D-78B9-433A-AD3F-CA5709FDAAF6`, version `1.0.1.0`, minimum Windows build `19041`).
- `InsightBoard.sideload.msix` (same identity and publisher; intended for sideload testing, not the normal Store upload).
- `InsightBoard.classic.appxbundle` (version `1.0.0.0`).
- `install.ps1` and `utils/pwainstaller.exe` (local installation helper).

**Critical rejection for public release:** the package manifest embeds `https://insightboard-staging-dipayan.onrender.com/` as its fallback/start URL and registers that staging host for URI handling. Do not submit or distribute this package as the public Store app.

**Additional package issue:** the modern MSIX bundle is version `1.0.1.0`, while the classic AppX bundle is `1.0.0.0`. Regenerate the package set together from one PWA Builder run after the final production origin and manifest are live. Do not mix files from separate package generations.

The package identity and publisher match the Partner Center identity previously supplied by the publisher. Keep these values unchanged. The display name inside the package is currently `InsightBoard`; align the final package display name and web manifest with the reserved Partner Center product name `InsightBoard VDB` before generating the final package.

## Current production-origin blocker

The Render production service is `insightboard-v2-bsiu`, tracking `main`, at `https://insightboard-v2-bsiu.onrender.com`. The current `main` branch does not contain `public/manifest.webmanifest`, `public/sw.js`, or the PNG PWA icons. The PWA-ready assets are only on `feature/global-ai-platform-foundation`.

Therefore the production URL cannot yet be used to generate a correct PWA package. The feature branch must first pass release gates and be approved for merge/deployment to the existing production service. This preparation does not authorize that merge or production deployment.

## Store listing content and assets

See [MICROSOFT_STORE_LISTING_DRAFT.md](MICROSOFT_STORE_LISTING_DRAFT.md) for proposed listing copy and the screenshot capture plan. Replace all publisher contact placeholders with a real, monitored support address and support URL before submission.

## Final release gates — all required

- [ ] User approves merging PR #12 and deploying the feature branch to the existing production service.
- [ ] Confirm production MongoDB and JWT environment variables are present without exposing their values.
- [ ] Confirm production readiness endpoint reports ready.
- [ ] Smoke-test registration, login, saved-report create/list/delete, account ownership boundaries, dashboard, CSV/JSON imports, exports, AI BYOK and voice BYOK.
- [ ] Verify production `/manifest.webmanifest`, `/sw.js`, `/privacy.html`, 192px and 512px PNG icons and offline fallback over HTTPS.
- [ ] Run PWA Builder against the production URL and resolve all blocking report-card findings.
- [ ] Generate a single consistent package set using the exact Partner Center identity and reserved display name.
- [ ] Install-test the MSIX package on a clean supported Windows machine; run Windows App Certification Kit where available.
- [ ] Prepare genuine product screenshots captured from the production build; no mockups or staging UI.
- [ ] Replace support placeholders; verify privacy notice against actual production behavior and add a monitored contact.
- [ ] Complete Partner Center properties, pricing, markets, age rating, privacy/support URLs and Store listing.
- [ ] Publisher reviews the final submission preview and explicitly authorizes **Submit for certification**.

## No-go rule

The uploaded ZIP is a staging candidate only. Do not submit it. Do not point a Store package at staging. Do not merge, deploy production, change Stage 2, or incur paid infrastructure costs without the required approval.
