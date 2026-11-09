# InsightBoard for Android

InsightBoard is packaged as a native Android application using Capacitor while retaining the existing React/Vite application and its dashboard workflows.

## Android packaging

- Native application ID: `com.dipayanhaldar.insightboard`
- Display name: `InsightBoard`
- Web assets: built locally into `dist/` and bundled into the APK
- Android shell: Capacitor 7
- API origin for the Android build: `https://insightboard-v2-bsiu.onrender.com`
- Build environment: Node.js 22, Java 21 and Android SDK

The Android API origin is injected at build time through `VITE_API_BASE_URL`. The web build keeps this value empty by default and therefore continues using same-origin API routes in browser development and hosting.

## Automated release

The workflow at `.github/workflows/android-release.yml` builds the web application, generates the Android project, runs Gradle's debug APK build, verifies the output and publishes the APK plus a SHA-256 checksum to the GitHub Release named **Version 1.0.0.1**.

The release workflow can be started manually from GitHub Actions or is triggered by relevant Android packaging changes merged into `main`.

## Included application capabilities

- CSV and JSON file import
- Interactive KPI summaries, charts, filters, search, sorting and data tables
- Dual-dataset comparison workspace
- CSV, Excel and PDF exports
- Hosted account and saved-report workflows through the configured API
- BYOK/provider AI workflows where provider configuration and network access are available
- Device-supported browser speech and narration features

## Platform constraints

- The APK bundles the web client; it does not embed the Node.js/Express server or MongoDB database.
- Hosted account, saved report, hosted AI and provider-backed speech operations require network access and a healthy configured backend.
- Local WebGPU inference is conditional on the Android device and its WebView implementation exposing compatible WebGPU support. A device without WebGPU must use a supported provider workflow or the non-AI dashboard features.
- Web Speech API voices and speech recognition support vary by Android version, WebView and installed voice services.
- Android file selection, storage access, share sheets and download behaviour depend on the Android System WebView and OS version. Validate on the target device before treating every export/share path as production-certified.
- The attached APK is debug-signed for direct installation and testing. Google Play distribution requires a protected, persistent upload/release keystore and a separate signed release build.

## Local build

```bash
npm ci
npm run build
npm install --no-save @capacitor/core@7.4.3 @capacitor/cli@7.4.3 @capacitor/android@7.4.3
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Release verification

After the GitHub Actions job completes:

1. Confirm the build job succeeded.
2. Download `InsightBoard-Android.apk` from the GitHub Release.
3. Verify its checksum using `sha256sum -c SHA256SUMS.txt`.
4. Install on a physical Android device and test import, analysis, comparison, exports, sign-in, saved reports, AI/provider connectivity, speech and offline launch.
5. Keep Play Store signing credentials outside the repository in protected GitHub Actions secrets.
