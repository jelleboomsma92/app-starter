// [APP_NAME] API — Cloudflare Worker
// Bindings required in wrangler.toml:
//   [[d1_databases]]
//   binding = "DB"
//   database_name = "[app]-db"
//   database_id = "<paste from: wrangler d1 create [app]-db>"

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const err = (msg, status = 400) => json({ error: msg }, status);

/* ─── Routing ─── */
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, '');
    const method = request.method;

    try {
      /* ── Items ── */
      if (path === '/items' && method === 'GET')  return getItems(env);
      if (path === '/items' && method === 'POST') return createItem(request, env);
      if (path.match(/^\/items\/[\w-]+$/) && method === 'PUT')    return updateItem(path.split('/')[2], request, env);
      if (path.match(/^\/items\/[\w-]+$/) && method === 'DELETE') return deleteItem(path.split('/')[2], env);

      return err('Not found', 404);
    } catch (e) {
      console.error(e);
      return err(`Internal server error: ${e.message}`, 500);
    }
  },
};

/* ═══════════════════════════════════════
   Items
═══════════════════════════════════════ */
async function getItems(env) {
  const rows = await env.DB.prepare(
    'SELECT id, name FROM items ORDER BY name'
  ).all();
  return json(rows.results);
}

async function createItem(request, env) {
  const body = await request.json();
  if (!body.id || !body.name) return err('id and name required');
  await env.DB.prepare('INSERT INTO items (id, name) VALUES (?, ?)')
    .bind(body.id, body.name).run();
  return json({ id: body.id }, 201);
}

async function updateItem(id, request, env) {
  const body = await request.json();
  if (!body.name) return err('name required');
  await env.DB.prepare("UPDATE items SET name=?, updated_at=datetime('now') WHERE id=?")
    .bind(body.name, id).run();
  return json({ id });
}

async function deleteItem(id, env) {
  await env.DB.prepare('DELETE FROM items WHERE id=?').bind(id).run();
  return json({ deleted: id });
}
