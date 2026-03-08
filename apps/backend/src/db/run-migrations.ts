import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getMigratorDatabaseUrl, resolveMigrationsFolder } from "./migrations/metadata.js";

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
  logger.info({ folder: migrationsFolder }, "running migrations");

  const sql = postgres(getMigratorDatabaseUrl(env));
  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder });
    logger.info("all migrations applied successfully");
  } finally {
    await sql.end();
  }
}
