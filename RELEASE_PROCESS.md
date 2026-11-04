# InsightBoard Release Workflow

## Branch model
- `main`: production source. Only merge reviewed and tested pull requests into this branch.
- `develop`: staging integration branch. Render staging tracks this branch.
- `feature/<short-name>`: new work; branch from `develop`, then open a PR into `develop`.
- `fix/<short-name>`: bug fixes; branch from `develop`, then open a PR into `develop`.
- `release/<version>`: optional release stabilization branch when a release needs a longer test window.

## Required flow
1. Create a feature/fix branch from `develop`.
2. Implement the change and test locally.
3. Open a PR into `develop`; the InsightBoard CI workflow must pass.
4. Merge into `develop`. Render staging deploys automatically.
5. Test the staging URL, including dataset switching, filters, charts, exports, API health and any changed feature.
6. When ready, open a PR from `develop` into `main`. Include a test checklist and screenshots for UI changes.
7. Review and merge only after staging acceptance and CI success.
8. Create a GitHub Release with a semantic version tag.
9. In Render production, manually deploy the approved `main` commit. Verify `/api/health` and the production smoke-test checklist.

## Production approval gate
The production Render service must keep Auto-Deploy disabled. Merging to `main` must not deploy production automatically. A person must explicitly trigger the production deploy after approving the release.

## Versioning
Use Semantic Versioning:
- Patch: `v2.0.3` — backward-compatible fixes.
- Minor: `v2.1.0` — backward-compatible features.
- Major: `v3.0.0` — breaking changes or major architecture changes.
- Pre-release: `v2.1.0-beta.1` for staging candidates; do not treat beta tags as production releases.

## Release notes checklist
Every published release should record:
- Summary
- Added features
- Improvements
- Bug fixes
- Breaking changes / migration notes (or `None`)
- Tests performed and staging URL
- Production deployment status and deployed commit SHA

## Render configuration
### Staging
- Branch: `develop`
- Auto-Deploy: On Commit
- Runtime: Node
- Region: Singapore
- Build: `npm install --include=dev && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Environment: `NODE_ENV=staging` plus staging-only secrets as needed.

### Production
- Branch: `main`
- Auto-Deploy: Off / manual
- Runtime: Node
- Region: Singapore
- Build: `npm install --include=dev && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Keep production secrets only in the production Render service.

## Safety rules
- Never test experimental changes directly on `main`.
- Never copy production database credentials into staging. Use a separate staging database and staging JWT secret.
- Do not delete historical branches until production has been verified from `main` and the release history is backed up.
