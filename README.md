# InsightBoard — Dual Dataset Dashboard

A responsive React + Vite dashboard that can switch between two datasets: the public Blackcoffer business-insights JSON and a Hyderabad Metro station reference dataset. Includes six charts, combined filters, search, KPI cards, a sortable/paginated table, local JSON/CSV import, CSV export, and PDF report export.

## Dataset switcher
- **Blackcoffer:** loads the publicly accessible `jsondata.json` from the original public repository at runtime. If the network request fails, the app falls back to clearly labeled synthetic Blackcoffer-style demo data. For offline use, download the dataset and use Import data.
- **Hyderabad Metro:** uses the bundled `src/hyderabad_metro_stations.json` file. It contains station reference records, not live arrival, ridership, or service status. The station list and line assignments should be verified against current official transit information before operational use.
- You can import a JSON array or an object containing a `records` array, or a CSV file. Imported files stay in the browser and are not uploaded to a server.

## Run on Windows / VS Code
1. Install Node.js LTS from https://nodejs.org/.
2. Extract this ZIP.
3. Open the `frontend` folder in VS Code.
4. Open Terminal → New Terminal. If PowerShell blocks npm scripts, select Command Prompt.
5. Run `npm install`, then `npm run dev`.
6. Open the local URL printed by Vite.
7. Run `npm run build` to check production compilation.

## Important architecture note
This is a frontend-only build. It does not currently use Express or MongoDB. If the assessment requires a database-backed REST API, add and deploy that backend as a separate step.
