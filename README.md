# InsightBoard — Dynamic Dataset & Export Update

This is a Vite + React project. It is intended to be deployed as a static website (for example, Vercel) or built and embedded/hosted through a WordPress workflow that supports custom front-end assets.

## Features in this update
- Import JSON arrays or objects containing `records` / `data`, plus CSV files.
- On import, replace the active dataset; fields, categorical filters, numeric summaries, chart groupings, and table columns are inferred from the imported records.
- Export filtered records as CSV or Excel (`.xlsx`).
- Export the visible chart panels as images inside a PDF, followed by a filtered-data table (up to 1,000 rows and the first 12 fields for readable PDF layout).
- Dataset logo panel: built-in initials for Blackcoffer and Hyderabad Metro presets, plus a **Choose logo** control for a user-provided PNG/JPG/WebP/SVG image. The chosen image is browser-session state; it is not uploaded to a server.
- Import controls remain visible at mobile widths.

## Run locally
1. Install Node.js 20 LTS or newer.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. For a production build, run `npm run build`; deploy the generated `dist` folder.

## Vercel settings
- Framework: Vite
- Root directory: repository root (`.`)
- Install: `npm install`
- Build: `npm run build`
- Output: `dist`

## Important deployment note
Uploading this ZIP to GitHub does not update a separately hosted WordPress site automatically. If WordPress is the live site, you must deploy the built assets to the WordPress setup or update the embed/iframe/source that WordPress uses. If Vercel is the source embedded in WordPress, first deploy to Vercel and verify the embedded URL points to that deployment.

## Logo note
The current Blackcoffer/Metro badges are text-based placeholders, not official logos. Replace them with the approved high-resolution logo images when provided. The in-app **Choose logo** control lets a user apply a logo for the current browser session.

## Data note
The included Hyderabad Metro JSON is the project reference dataset. Synthetic or user-imported demo files should be clearly labelled and not represented as verified company sales.
