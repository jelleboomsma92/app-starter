# app-starter

Template for Bhomely household PWAs: one Cloudflare Worker per app (static frontend + API under `/api`), a D1 database, and Cloudflare Access in front.

**Stack:** Cloudflare Access → Cloudflare Worker (assets + `/api`) → Cloudflare D1 (SQLite)
**Deploy:** Cloudflare Workers Builds (push to `main`)
**Design:** the Bhomely Design System (`Bhomely/design/`): cream background, forest header, Manrope, Lucide icons. The design CSS is written into `frontend/index.html` by `node design/sync.mjs <app>/frontend`.

Full setup steps: "New app setup" in `Bhomely/docs/worker-and-d1.md`.

## Quick start

```bash
# 1. Use as template on GitHub, then clone into Bhomely/<app>/
git clone https://github.com/jelleboomsma92/<new-app>

# 2. Create the D1 database and paste the database_id into wrangler.jsonc
npx wrangler d1 create <app>-db

# 3. Update names
#    wrangler.jsonc          → name, database_name, database_id
#    frontend/index.html     → APP_NAME
#    frontend/sw.js          → CACHE_NAME
#    frontend/manifest.json  → name, short_name, description
#    icon                    → cd ../icons && node build.mjs <Letter> ../<app>/frontend
#    design CSS              → cd .. && node design/sync.mjs <app>/frontend

# 4. Run the schema
npx wrangler d1 execute <app>-db --remote --file=api/schema.sql

# 5. Cloudflare dashboard → Workers & Pages → Create → Import a repository
#    (deploy command: npx wrangler deploy)

# 6. Zero Trust → Access → Applications → Self-hosted, destination = this Worker only.
#    Copy the AUD tag into ACCESS_AUD in wrangler.jsonc and push.
```

## Structure

```
wrangler.jsonc    ← Worker config: assets, D1 binding, Access vars
frontend/
  index.html      ← single-file PWA (design system + app logic)
  manifest.json
  sw.js           ← network-first pages, offline fallback
api/
  worker.js       ← API under /api: Access JWT check, validation, D1
  schema.sql      ← D1 schema (run once)
CLAUDE.md         ← Claude Code context (update with app name)
```
