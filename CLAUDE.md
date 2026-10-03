# [APP_NAME]

A Bhomely household app, created from `app-starter`. Suite rules (stack, JS dialect, design system, security, versioning) are in `../CLAUDE.md` in the Bhomely parent folder, with reference docs in `../docs/`. Keep this file limited to what's specific to this app.

**Never start coding without explicit direction.**

## This app
- **What it does**: _describe_
- **JS**: modern (new app). Use `const`/`let`, arrow functions, template literals. Inside blocks, use `const fn = () =>`, never `function fn() {}`.
- **Look**: the Bhomely Design System. The design CSS sits in `frontend/index.html` between `bhomely:design:start/end`, written by `node design/sync.mjs <app>/frontend` from the Bhomely folder (never edit it there). Below it only this app's own classes: rename the template's `app-` prefix to the app's own (Meadlog `ml-`, Lembas `lb-`, Pennywise `pw-`). The template shows the shared patterns: forest header with one mustard word, panels for empty/loading/signed-out states, a bottom sheet with its input in `state`, a toast, and Lucide icons as data.
- **Current version**: v0.1 (`VERSION` in `frontend/index.html`; bump `CACHE_NAME` in `frontend/sw.js` together with it)
- **Files**: `frontend/` (PWA), `api/` (`worker.js`, D1 `schema.sql`), `wrangler.jsonc` at the repo root
- **One Worker, one origin** (like Lembas and Meadlog): the Worker serves the PWA from `./frontend` and the API under `/api/*` (`assets.run_worker_first`). No CORS.
- **Live**: _`https://<app>.jelle-boomsma92.workers.dev`_

## Deployment
Pushing to `main` deploys app and API together via Cloudflare Workers Builds.

## Access & auth
The whole Worker is behind a Cloudflare Access app (team `chaoscoding`, policies "Alleen ik" and "Vicky", 1-month session) whose only destination is this Worker (production and preview URLs). The API also verifies the Access JWT itself (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` in `wrangler.jsonc`). An expired login shows "You are signed out" with a "Sign in again" button.

## Local testing
`npx wrangler d1 execute my-app-db --local --file=api/schema.sql`, then `npx wrangler dev --local` from the repo root. Put a test JWKS in `.dev.vars` as `ACCESS_JWKS='{"keys":[…]}'` (gitignored) and send tokens signed with that key in `Cf-Access-Jwt-Assertion`. Never set `ACCESS_JWKS` in production.

## One-time setup
Follow "New app setup" in `../docs/worker-and-d1.md`. When done, delete this line and fill in "This app" above.
