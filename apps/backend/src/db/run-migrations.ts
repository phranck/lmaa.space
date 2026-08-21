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
 * Key for the advisory lock that serialises migration runs.
 *
 * `initCommands` in `zerops.yml` run on every container start, so a deployment
 * with more than one container starts several migration runs at once. Drizzle
 * decides what is pending by reading `drizzle_migrations`, which means two
 * simultaneous runs both see the same pending migration and both apply it.
 *
 * The value is arbitrary but has to stay stable, because a changed key would no
 * longer exclude a container still running the previous build.
 */
const MIGRATION_ADVISORY_LOCK_KEY = 46_102_026;

/**
 * Applies any pending Drizzle migrations against the configured database.
 *
 * Safe to call repeatedly, because Drizzle tracks applied migrations and skips
 * those already present in the `drizzle_migrations` table.
 *
 * Safe to call concurrently, because an advisory lock serialises the runs. A
 * second caller waits for the first to finish and then finds nothing pending.
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
    // Vetting the connection first means a rejected identity never reaches the
    // point where it would block another container.
    await assertSafeMigrationConnection(sql, databaseUrl, env.DB_MIGRATION_ROLE);

    await sql`SELECT pg_advisory_lock(${MIGRATION_ADVISORY_LOCK_KEY})`;
    try {
      await migrate(db, { migrationsFolder });
      await assertMigrationTableOwnership(sql, env.DB_MIGRATION_ROLE ?? "local");
      logger.info("all migrations applied successfully");
    } finally {
      await sql`SELECT pg_advisory_unlock(${MIGRATION_ADVISORY_LOCK_KEY})`;
    }
  } finally {
    await sql.end();
  }
}
