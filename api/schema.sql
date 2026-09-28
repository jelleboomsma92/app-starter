-- Starter schema: replace with your actual tables
-- Run with: npx wrangler d1 execute my-app-db --remote --file=api/schema.sql  (--local for wrangler dev)

CREATE TABLE IF NOT EXISTS items (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_by TEXT NOT NULL,              -- email from the Access login
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
