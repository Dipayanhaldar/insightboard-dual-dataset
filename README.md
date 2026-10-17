# InsightBoard — Dynamic Dataset Dashboard

InsightBoard is a React + Vite data exploration dashboard designed for Vercel deployment.

## Current features
- Built-in datasets: Blackcoffer Corporate Data and Hyderabad Metro Rail station-reference data.
- Import JSON arrays or objects containing `records` / `data`, plus CSV files. An **Imported Data** selection appears only after a file has been loaded.
- Imported records replace the currently active dataset; they are not merged with built-in presets.
- URL, link, href and hyperlink fields are hidden from the dashboard fields, filters, charts, table and exports.
- Dynamic categorical filters, KPI cards, six chart panels, and searchable, sortable, paginated records table.
- Light mode by default, with a dark-mode toggle. The selected appearance is remembered in the current browser.
- Export filtered records as CSV or Excel (`.xlsx`).
- Export the visible chart panels as images inside a PDF, followed by a filtered-data table (up to 1,000 rows and the first 12 fields for readable PDF layout).
- Responsive import and chart controls for smaller screens.
- Preset logo assets and an optional user-provided dataset logo for the current browser session.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Run `npm run build` to verify a production build.

## Vercel settings
- Framework: Vite
- Root directory: repository root (`.`)
- Install: `npm install`
- Build: `npm run build`
- Output: `dist`

## Data note
The built-in Hyderabad Metro data is station-reference data, not live train-position or service-status information. Imported files are processed in the browser and are not uploaded to a server by this version.
