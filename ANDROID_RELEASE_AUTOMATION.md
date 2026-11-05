# InsightBoard Android and GitHub Release Automation

## What is included

- Capacitor 8 packages the existing Vite React app as an Android application.
- Android API requests use `VITE_API_BASE_URL`; the release APK is configured to call the existing production Render API.
- Express allows CORS only from the Capacitor Android WebView origins `https://localhost` and `capacitor://localhost`. The existing same-origin website routes are unchanged.
- MongoDB remains hosted by the existing MongoDB Atlas connection configured in Render. No database migration or new database is created.
- GitHub Actions builds a debug APK on feature-branch CI for validation.
- A stable version tag such as `v2.0.3` builds and attaches a signed APK plus SHA-256 checksum to a GitHub Release.
- The release job checks that the tag points to a commit merged into `main`, and that the production API and database are healthy with Capacitor CORS enabled.
- The workflow does not deploy to Render.

## One-time Android signing setup

A stable signing key is required. Without the same private key on every release, Android will reject upgrades over an already-installed APK.

1. On a trusted computer with Java installed, generate a release keystore:

   ```bash
   keytool -genkeypair -v -keystore insightboard-release.jks -keyalg RSA -keysize 4096 -validity 10000 -alias insightboard
   ```

2. Keep the `insightboard-release.jks` file and passwords backed up securely. Never commit the keystore to GitHub.
3. Convert the keystore to one base64 line:
   - macOS/Linux: `base64 -w 0 insightboard-release.jks`
   - macOS alternative: `base64 insightboard-release.jks | tr -d '\\n'`
   - PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("insightboard-release.jks"))`
4. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**. Add these four secrets:
   - `ANDROID_KEYSTORE_BASE64`: the one-line base64 keystore content
   - `ANDROID_KEYSTORE_PASSWORD`: keystore password
   - `ANDROID_KEY_ALIAS`: `insightboard` (or the alias you selected)
   - `ANDROID_KEY_PASSWORD`: private-key password
5. Do not regenerate the keystore for later versions. Losing it means users cannot install future APK updates over the existing app; they would have to uninstall first.

## Release procedure (every release)

1. Merge the tested changes into `main`. The Render staging service currently follows `main`; test the staging URL before proceeding.
2. Verify staging: sign-in/register, `/api/health`, MongoDB report save/load/delete, AI provider endpoints, Gnani TTS endpoint, dataset switching, CSV/Excel/PDF exports, and responsive layout.
3. Review the change and CI evidence. Only then manually deploy the approved commit to the Render production service. Production auto-deploy remains off.
4. Confirm production `/api/health` returns `status: ok` and `database: true`. The release workflow independently enforces this health check and verifies Android WebView CORS.
5. Ensure `package.json` version matches the intended stable version. Current prepared version: `2.0.3`.
6. Create and push the tag from the approved `main` commit:

   ```bash
   git checkout main
   git pull
   git tag v2.0.3
   git push origin v2.0.3
   ```

7. Open **GitHub → Actions** and monitor **InsightBoard Android Release**. On success, the GitHub Release contains `InsightBoard-2.0.3.apk` and its `.sha256` checksum.

## Important

- Distribution target is GitHub Releases; Google Play publishing is not configured.
- Every stable tag matching `vMAJOR.MINOR.PATCH` triggers an APK build.
- Pre-release tags (for example `v2.1.0-beta.1`) are intentionally rejected by this stable release workflow.
- APK installation is user-initiated. GitHub Releases does not silently install updates on Android.
- A new APK must be signed with the same keystore and package ID `com.dipayan.insightboard` to update an existing installation.
- The first production release must happen only after the updated Express CORS middleware has been deployed and verified on Render.
