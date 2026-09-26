# [APP_NAME]

A Bhomely household app, created from `app-starter`. Suite rules (stack, JS dialect, design system, security, versioning) are in `../CLAUDE.md` in the Bhomely parent folder, with reference docs in `../docs/`. Keep this file limited to what's specific to this app.

**Never start coding without explicit direction.**

## This app
- **What it does**: _describe_
- **JS**: modern (new app). Use `const`/`let`, arrow functions, template literals. Inside blocks, use `const fn = () =>`, never `function fn() {}`.
- **Current version**: v0.1 (`VERSION` in `frontend/index.html`)
- **Files**: `frontend/` (PWA), `api/` (Worker + D1 `schema.sql`), `.github/workflows/deploy-worker.yml`
- **Live**: _Pages URL_ · _Worker URL_

## Deployment
Push to `main` to deploy: Cloudflare Pages redeploys `frontend/`, and the GitHub Action deploys the Worker when `api/` changes.

## One-time setup
Follow "New app setup" in `../docs/worker-and-d1.md`. When done, delete this line and fill in "This app" above.
