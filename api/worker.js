// [APP_NAME] API: runs in the same Worker as the static app (see wrangler.jsonc).
// Only /api/* reaches this code (assets.run_worker_first); everything else is served
// from ./frontend by the assets layer. The whole Worker sits behind Cloudflare Access,
// and every API request also verifies the Access JWT itself (defence in depth).
//
// Environment:
//   DB                  D1 database [app]-db
//   ASSETS              static assets binding
//   ACCESS_TEAM_DOMAIN  e.g. "https://chaoscoding.cloudflareaccess.com"
//   ACCESS_AUD          AUD tag of the app's Access application
//   ACCESS_JWKS         optional, local testing only (.dev.vars): JWKS JSON used instead of fetching certs

const ID_RE          = /^[\w-]{1,64}$/;
const MAX_NAME       = 200;
const MAX_BODY_BYTES = 1024 * 1024;
const CERTS_TTL_MS   = 60 * 60 * 1000;

/* ─── Responses ─── */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const err = (msg, status = 400) => json({ error: msg }, status);

/* ─── Entry ─── */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      const email = await requireUser(request, env);
      return await route(request, env, url.pathname.replace(/\/$/, ''), email);
    } catch (e) {
      if (e instanceof HttpError) return err(e.message, e.status);
      console.error(e);                     // details stay in Worker logs
      return err('Internal error', 500);    // never echo e.message to the client
    }
  },
};

async function route(request, env, path, email) {
  const method = request.method;

  if (path === '/api/items' && method === 'GET')  return await getItems(env);
  if (path === '/api/items' && method === 'POST') return await createItem(request, env, email);

  const m = path.match(/^\/api\/items\/([^/]+)$/);
  if (m && method === 'PUT')    return await updateItem(request, env, checkId(m[1]));
  if (m && method === 'DELETE') return await deleteItem(env, checkId(m[1]));

  throw new HttpError(404, 'Not found');
}

/* ─── Validation ─── */
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function checkId(v) {
  if (typeof v !== 'string' || !ID_RE.test(v)) throw new HttpError(400, 'Invalid id');
  return v;
}

function checkName(v) {
  if (typeof v !== 'string') throw new HttpError(400, 'Name is required');
  const s = v.trim();
  if (!s || s.length > MAX_NAME) throw new HttpError(400, 'Name must be 1 to ' + MAX_NAME + ' characters');
  return s;
}

async function readJson(request) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new HttpError(400, 'Invalid JSON');
  }
}

/* ─── Items (starter example: replace with the app's own resources) ─── */
async function getItems(env) {
  const rows = await env.DB.prepare('SELECT id, name, created_by FROM items ORDER BY name').all();
  return json(rows.results);
}

async function createItem(request, env, email) {
  const body = await readJson(request);
  if (!isObject(body)) throw new HttpError(400, 'Invalid request');
  const id   = checkId(body.id);
  const name = checkName(body.name);
  const res = await env.DB.prepare('INSERT INTO items (id, name, created_by) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING')
    .bind(id, name, email).run();
  if (!res.meta.changes) throw new HttpError(409, 'Item already exists');
  return json({ id, name, created_by: email }, 201);
}

async function updateItem(request, env, id) {
  const body = await readJson(request);
  if (!isObject(body)) throw new HttpError(400, 'Invalid request');
  const name = checkName(body.name);
  const res = await env.DB.prepare("UPDATE items SET name = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(name, id).run();
  if (!res.meta.changes) throw new HttpError(404, 'Not found');
  return json({ id, name });
}

async function deleteItem(env, id) {
  await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
  return json({ deleted: id });
}

/* ─── Cloudflare Access JWT ─── */
let certsCache = { keys: null, fetchedAt: 0 };

async function requireUser(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error('ACCESS_TEAM_DOMAIN / ACCESS_AUD not configured');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'Not signed in');

  const payload = await verifyAccessJwt(token, env);
  if (typeof payload.email !== 'string' || !payload.email.includes('@')) throw new HttpError(401, 'Not signed in');
  return payload.email.toLowerCase();
}

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};
const b64urlToJson = (s) => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

async function getSigningKeys(env, forceRefresh) {
  if (env.ACCESS_JWKS) return JSON.parse(env.ACCESS_JWKS).keys;
  const fresh = Date.now() - certsCache.fetchedAt < CERTS_TTL_MS;
  if (certsCache.keys && fresh && !forceRefresh) return certsCache.keys;
  const res = await fetch(env.ACCESS_TEAM_DOMAIN + '/cdn-cgi/access/certs');
  if (!res.ok) throw new Error('Could not fetch Access certs: ' + res.status);
  certsCache = { keys: (await res.json()).keys, fetchedAt: Date.now() };
  return certsCache.keys;
}

async function verifyAccessJwt(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Not signed in');

  let header, payload;
  try {
    header  = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch (e) {
    throw new HttpError(401, 'Not signed in');
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new HttpError(401, 'Not signed in');

  let jwk = (await getSigningKeys(env, false)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getSigningKeys(env, true)).find((k) => k.kid === header.kid);   // keys rotate
  if (!jwk) throw new HttpError(401, 'Not signed in');

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1])
  );
  if (!valid) throw new HttpError(401, 'Not signed in');

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD))                          throw new HttpError(401, 'Not signed in');
  if (payload.iss !== env.ACCESS_TEAM_DOMAIN)                 throw new HttpError(401, 'Not signed in');
  if (typeof payload.exp !== 'number' || payload.exp < now)   throw new HttpError(401, 'Not signed in');
  if (typeof payload.nbf === 'number' && payload.nbf > now + 60) throw new HttpError(401, 'Not signed in');
  return payload;
}
