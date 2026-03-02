import { existsSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../config/env.js";

function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(process.cwd(), "apps/backend/drizzle"),
    path.resolve(process.cwd(), "drizzle"),
  ];

  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta", "_journal.json"))) {
      return folder;
    }
  }

  throw new Error(`Could not find Drizzle migrations folder. Checked: ${candidates.join(", ")}`);
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
  const sql = postgres(env.DATABASE_URL);
  const db = drizzle(sql);

  const migrationsFolder = resolveMigrationsFolder();
  console.log(`Running Drizzle migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
  await sql.end();
}
