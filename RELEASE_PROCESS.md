# InsightBoard Release Workflow

## Branch model
- `main`: production source. Merge only reviewed, tested pull requests.
- `develop`: staging integration branch. Render staging deploys this branch automatically.
- `feature/<short-name>` and `fix/<short-name>`: branch from `develop`; open PRs back into `develop`.
- Optional `release/<version>`: stabilization branch for a longer acceptance-test window.

## Environments
### Staging
- Render service: `insightboard-staging-dipayan`
- URL: https://insightboard-staging-dipayan.onrender.com
- Service dashboard: https://dashboard.render.com/web/srv-dblite942hec738bu5b0
- Git branch: `develop`
- Auto-deploy: On Commit
- Runtime: Node
- Region: Singapore
- Plan: Free
- Build: `npm install --include=dev && npm run build`
- Start: `npm start`
- Set `NODE_ENV=staging`
- Configure health check path `/api/health` in Render when available.
- Use staging-only database credentials and a staging-only JWT secret. Never copy production secrets into staging.

### Production
- Existing service: `insightboard-v2-bsiu`
- URL: https://insightboard-v2-bsiu.onrender.com
- Service dashboard: https://dashboard.render.com/web/srv-dbb0tve7bikc73baq6m0
- Target Git branch: `main`
- Auto-deploy: Off / Manual
- Runtime: Node
- Region: Singapore
- Build: `npm install --include=dev && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Merge to `main` must NOT automatically deploy production. Manually deploy only after release approval.

## Required release flow
1. Create a feature/fix branch from `develop`.
2. Implement and test locally.
3. Open a PR into `develop`. The `InsightBoard CI` workflow must pass.
4. Merge into `develop`; Render staging deploys automatically.
5. Test staging: dataset switching, dataset-specific filters, KPI summaries, charts, record table, CSV/PDF exports, API health, responsive layout, and every changed feature.
6. Open a PR from `develop` into `main`. Include a concise change summary, test evidence, and screenshots for UI changes.
7. Review the PR and confirm CI passes. Merge only after staging acceptance.
8. Create a GitHub Release and semantic version tag for the approved `main` commit.
9. Manually deploy that approved `main` commit to Render production.
10. Verify production URL and `/api/health`; record the deployed commit SHA in the release notes.

## Versioning
- Patch: `v2.0.3` — backward-compatible bug fixes.
- Minor: `v2.1.0` — backward-compatible features.
- Major: `v3.0.0` — breaking changes or major architecture changes.
- Pre-release: `v2.1.0-beta.1` — staging candidate only, not a production release.

## Release notes template
Every release must record:
- Summary
- Added features
- Improvements
- Bug fixes
- Breaking changes / migration notes (or `None`)
- Tests performed and staging URL
- Production deployment status
- Deployed commit SHA

## Safety rules
- Never develop experimental changes directly on `main`.
- Keep production Auto-Deploy disabled.
- Never use production database credentials or JWT secrets in staging.
- Do not delete historical branches until production has been verified from `main`.
- Keep the existing production service on its current branch until the Render dashboard is deliberately switched to `main` and the first deployment from `main` is verified.
