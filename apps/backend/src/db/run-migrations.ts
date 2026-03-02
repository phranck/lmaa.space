import { existsSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../config/env.js";

function resolveMigrationsFolder(): string {
  const candidates = [
    // __dirname-based: robust regardless of cwd (CJS bundle).
    // dist/index.js      → __dirname = dist/    → ../drizzle
    path.resolve(__dirname, "..", "drizzle"),
    // dist/db/migrate.js → __dirname = dist/db/ → ../../drizzle
    path.resolve(__dirname, "..", "..", "drizzle"),
    // cwd-based fallbacks (local dev / monorepo root)
    path.resolve(process.cwd(), "apps/backend/drizzle"),
    path.resolve(process.cwd(), "drizzle"),
  ];

  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta", "_journal.json"))) {
      return folder;
    }
  }

  throw new Error(
    `Drizzle migrations folder not found. Checked:\n${candidates.map((c) => `  ${c}`).join("\n")}`,
  );
}

/**
 * Applies any pending Drizzle migrations against the configured database.
 *
 * Safe to call multiple times – Drizzle tracks applied migrations and skips
 * those already present in the `drizzle_migrations` table.
 *
 * Opens a dedicated short-lived connection that is closed after migration.
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = resolveMigrationsFolder();
  console.log(`[migrations] Using folder: ${migrationsFolder}`);

  const sql = postgres(env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder });
    console.log("[migrations] All migrations applied successfully.");
  } finally {
    await sql.end();
  }
}
