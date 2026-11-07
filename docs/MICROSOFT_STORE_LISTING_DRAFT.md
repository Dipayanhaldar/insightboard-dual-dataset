# Microsoft Store listing draft — InsightBoard VDB

Status: editorial draft only; not submitted.
Reserved Partner Center product name shown by publisher: **InsightBoard VDB**
Publisher display name: **Dipayan Haldar**
Distribution: Free
Product type: PWA packaged as MSIX
Primary audience: analysts, students, business users and teams exploring tabular data.

## Short description

Explore, compare and understand datasets with interactive dashboards, data visualizations and exportable insights.

## Long description

InsightBoard VDB is a data exploration workspace for turning CSV and JSON datasets into interactive views you can inspect and compare.

**Explore your data**
- Import CSV and JSON data into the browser.
- Review key metrics, charts, filters and searchable records.
- Switch between light and dark themes.
- Export supported results to CSV, Excel and PDF.

**Compare datasets**
- Load a second dataset without replacing the active dashboard dataset.
- Compare row counts, shared fields, numeric averages and category counts.
- Export numeric comparison results.

**Save and extend your work**
- Use account-backed saved reports when the connected service is available.
- Connect supported AI providers using your own provider API key (BYOK).
- Use voice features with your own provider key where supported.

InsightBoard processes dashboard datasets in the browser for its core exploration and comparison workflows. Account, saved-report and external-provider features require an internet connection. AI and voice provider usage is subject to the provider's own terms, limits and charges.

**Important:** only retain the account, AI, voice and export feature statements above if each is verified in the final production build and on a clean Windows installation. Remove any feature that fails production smoke testing.

## Suggested Store metadata

- Product name: InsightBoard VDB (must match the reserved Partner Center name).
- Category: Productivity or Business (choose the closest available category in Partner Center).
- Pricing: Free.
- Supported markets: choose only markets the publisher intends and can support.
- Keywords: data analysis, dataset, CSV, JSON, dashboard, data visualization, compare datasets, business intelligence, reports.
- Age rating: answer the Partner Center/IARC questionnaire truthfully based on the actual app and linked content; do not guess a rating.
- Publisher: Dipayan Haldar (must match Partner Center).
- Package identity: `DipayanHaldar.InsightBoardVDB`.
- Publisher ID: `CN=D9ADEC2D-78B9-433A-AD3F-CA5709FDAAF6`.

## Required publisher details — do not invent

- Support email: **Contact.dipayanhaldar@gmail.com**
- Support website: **[publisher must provide a monitored URL]**
- Privacy policy URL: `https://insightboard-v2-bsiu.onrender.com/privacy.html` only after the PWA release is approved and that route is verified live on production.
- Legal publisher/business details: enter the truthful details required by Partner Center.

## Screenshot capture plan

Capture genuine screenshots from the approved production build, in English, at the resolution and aspect ratios accepted by the current Partner Center listing form. Suggested sequence:

1. Main dashboard with KPI cards and charts, populated using a non-sensitive sample dataset.
2. Dataset import/records view showing CSV/JSON workflow.
3. Compare datasets workspace with two clearly labelled sample datasets.
4. Export/report workflow showing available output formats.
5. Settings/theme or AI Provider Hub, only if these features are verified and the screenshot contains no API keys, account details or personal data.

Use clean sample data only. Do not include staging URLs, debug banners, browser developer tools, personal accounts, private datasets, API keys or mock UI.

## Submission checklist

- [ ] Confirm final product name and package identity in Partner Center.
- [ ] Confirm production URL and all PWA assets are live.
- [ ] Confirm privacy policy and support contact are real and monitored.
- [ ] Capture actual production screenshots.
- [ ] Complete category, markets, free pricing and IARC age rating.
- [ ] Upload the final MSIX bundle and classic AppX bundle from the same PWA Builder generation if Partner Center requests both.
- [ ] Review the complete listing preview and package validation results.
- [ ] Obtain publisher's explicit final authorization before submitting for certification.
