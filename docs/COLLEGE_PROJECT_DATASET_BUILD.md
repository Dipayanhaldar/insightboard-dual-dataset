# College-project dataset build

This branch restores the Blackcoffer dataset selector and its PDF-report logo for the separate college-project deployment.

## Build separation
- Microsoft Store / public production: leave `VITE_ENABLE_BLACKCOFFER_DATASET` unset or set it to `false`. The Blackcoffer preset and logo are not included in the running app UI.
- College project deployment only: set `VITE_ENABLE_BLACKCOFFER_DATASET=true` in that deployment's build environment, then rebuild and deploy this branch.

The college build currently retrieves the dataset from the source URL defined in `src/main.jsx`. Confirm that this exact source/file is the one covered by the company's written permission before publishing it. Prefer a company-approved, controlled source if the permission specifies one.

Do not merge this branch into the Microsoft Store production branch unless the dataset is intentionally excluded again and the Store build is revalidated.
