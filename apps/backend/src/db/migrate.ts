import { Database } from "bun:sqlite";

const dbPath = process.env.DATABASE_PATH ?? "./deinshop.db";
const sqlite = new Database(dbPath, { create: true });

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

console.log("Running migrations...");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT NOT NULL UNIQUE,
    icon       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shops (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    url         TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    region      TEXT NOT NULL DEFAULT '',
    pickup      TEXT NOT NULL DEFAULT '',
    shipping    TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_shops_category ON shops(category_id);
  CREATE INDEX IF NOT EXISTS idx_shops_active   ON shops(is_active);

  CREATE TABLE IF NOT EXISTS submissions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name           TEXT NOT NULL,
    shop_url            TEXT NOT NULL,
    category_id         INTEGER REFERENCES categories(id),
    category_suggestion TEXT,
    region              TEXT NOT NULL DEFAULT '',
    pickup              TEXT NOT NULL DEFAULT '',
    shipping            TEXT NOT NULL DEFAULT '',
    description         TEXT NOT NULL DEFAULT '',
    submitter_email     TEXT,
    submitter_note      TEXT,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    admin_note          TEXT,
    feedback_sent       INTEGER NOT NULL DEFAULT 0,
    reviewed_by         INTEGER REFERENCES admin_users(id),
    reviewed_at         TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_owner      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    admin_user_id INTEGER NOT NULL REFERENCES admin_users(id),
    expires_at    TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS dead_link_reports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    ip_hash     TEXT NOT NULL,
    reported_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_dlr_shop ON dead_link_reports(shop_id);
`);

// Additive migrations (safe to run multiple times)
try {
  sqlite.exec(`ALTER TABLE shops ADD COLUMN og_image TEXT`);
  console.log("Added og_image column to shops.");
} catch {
  // Column already exists
}

// FTS5 full-text search for shops
sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS shops_fts USING fts5(
    name, description, region, shipping,
    content='shops', content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS shops_fts_insert AFTER INSERT ON shops BEGIN
    INSERT INTO shops_fts(rowid, name, description, region, shipping)
    VALUES (new.id, new.name, new.description, new.region, new.shipping);
  END;

  CREATE TRIGGER IF NOT EXISTS shops_fts_update AFTER UPDATE ON shops BEGIN
    INSERT INTO shops_fts(shops_fts, rowid, name, description, region, shipping)
    VALUES ('delete', old.id, old.name, old.description, old.region, old.shipping);
    INSERT INTO shops_fts(rowid, name, description, region, shipping)
    VALUES (new.id, new.name, new.description, new.region, new.shipping);
  END;

  CREATE TRIGGER IF NOT EXISTS shops_fts_delete AFTER DELETE ON shops BEGIN
    INSERT INTO shops_fts(shops_fts, rowid, name, description, region, shipping)
    VALUES ('delete', old.id, old.name, old.description, old.region, old.shipping);
  END;
`);

console.log("Migrations complete.");
sqlite.close();
