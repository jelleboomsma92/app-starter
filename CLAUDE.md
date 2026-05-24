# [APP_NAME] — Claude Code Context

## Project
Part of a household app suite (Lembas, Pennywise, and more). Built for two users: Jelle and his wife.

Full suite docs: see Lembas repo `/docs/` for Architecture, DesignSystem, and Project references.

## Stack
```
Cloudflare Pages (frontend/) → Cloudflare Worker (api/worker.js) → Cloudflare D1 (SQLite)
```
Auth: Cloudflare Access (Zero Trust) — Jelle and wife's emails only.

## Hard rules — never violate

**Never start coding without explicit direction.**

**Modern JS throughout.** Use `const`/`let`, arrow functions, template literals, `for...of`, rest params, destructuring. Never use `function fn() {}` declarations inside blocks (`if`/`for`/nested functions) — use `const fn = () =>` instead. This is a JS spec issue, not a style choice.

**No `innerHTML` with dynamic data.** Use the `el()` DOM helper for all dynamic content.

**Data layer isolation.** All `fetch()` calls live in dedicated data layer functions (`apiGet`, `apiPost`, etc.), never in UI/render logic.

**State discipline.** Always write form/modal state back to the `state` object — never into local variables that get discarded on re-render.

**Design system.** Never hardcode colour hex values — use CSS custom properties. Use `.tab-bar`/`.tab-btn` for all tab switchers.

**Security.** Built as if reviewed by a pentester. Never embed secrets in `index.html`.

**Versioning.** Increment the minor version on every change. Major version only when instructed. Always show the current version after a change.

## Current state
- App is at v0.1
- Frontend: single `index.html` (vanilla JS, `el()` DOM builder, `state`+`render` architecture)
- API: `api/worker.js` (Cloudflare Worker, D1 binding via `env.DB`)
- Database: Cloudflare D1

## Deployment
Push to `main` auto-deploys:
- Frontend → Cloudflare Pages (watches `frontend/`)
- Worker → GitHub Action in `.github/workflows/deploy-worker.yml` (watches `api/`)

## One-time setup checklist
1. `wrangler d1 create <app>-db` — paste returned `database_id` into `api/wrangler.toml`
2. Update `name` in `api/wrangler.toml` to `<app>-api`
3. `wrangler d1 execute <app>-db --file=api/schema.sql` — run the schema
4. Update `APP_NAME` and `API` constant in `frontend/index.html`
5. Update app name in `frontend/manifest.json`
6. Connect repo to Cloudflare Pages in the Cloudflare dashboard (set build output to `frontend/`)
7. Add `CLOUDFLARE_API_TOKEN` secret in GitHub repo Settings → Secrets and variables → Actions
