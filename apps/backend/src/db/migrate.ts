import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const dbPath = process.env.DATABASE_PATH ?? "./deinshop.db";
const sqlite = new Database(dbPath, { create: true });

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

const db = drizzle(sqlite);

console.log("Running migrations...");
migrate(db, { migrationsFolder: "./src/db/migrations" });

// Create FTS5 virtual table for full-text search
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
