# app-starter

Template for household PWAs on Cloudflare Pages + Workers + D1.

**Stack:** Cloudflare Pages → Cloudflare Worker → Cloudflare D1 (SQLite)  
**Design:** Warm dark theme — Cormorant Garamond + JetBrains Mono  
**Auth:** Cloudflare Access (Zero Trust)

## Quick start

```bash
# 1. Use as template on GitHub, then clone
git clone https://github.com/jelleboomsma92/<new-app>

# 2. Create the D1 database
wrangler d1 create <app>-db
# → paste the returned database_id into api/wrangler.toml

# 3. Update names
#    api/wrangler.toml  → name, database_name, database_id
#    frontend/index.html → APP_NAME, API url
#    frontend/manifest.json → name, short_name

# 4. Run the schema
wrangler d1 execute <app>-db --file=api/schema.sql

# 5. Connect to Cloudflare Pages
#    Dashboard → Pages → Connect to Git → select repo
#    Build output directory: frontend

# 6. Add GitHub secret
#    Repo → Settings → Secrets → CLOUDFLARE_API_TOKEN

# 7. Push to main — auto-deploys everything
```

## Structure

```
frontend/
  index.html      ← single-file PWA (design system + app logic)
  manifest.json
  sw.js
api/
  worker.js       ← Cloudflare Worker (CRUD endpoints)
  wrangler.toml   ← Worker config (fill in database_id)
  schema.sql      ← D1 schema (run once)
.github/workflows/
  deploy-worker.yml
CLAUDE.md         ← Claude Code context (update with app name)
```
