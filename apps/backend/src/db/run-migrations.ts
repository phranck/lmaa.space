import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import {
  assertMigrationTableOwnership,
  assertSafeMigrationConnection,
} from "./migration-safety.js";
import { getMigratorDatabaseUrl, resolveMigrationsFolder } from "./migrations/metadata.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

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

  const databaseUrl = getMigratorDatabaseUrl(env);
  // Migrations run one after another, so a pool buys nothing. This starts as a
  // Zerops init command while the previous containers still hold their own
  // pools, which is when the database has the fewest connection slots to spare.
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql);

  try {
    await assertSafeMigrationConnection(sql, databaseUrl, env.DB_MIGRATION_ROLE);
    await migrate(db, { migrationsFolder });
    await assertMigrationTableOwnership(sql, env.DB_MIGRATION_ROLE ?? "local");
    logger.info("all migrations applied successfully");
  } finally {
    await sql.end();
  }
}
