import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  getMigratorDatabaseUrl,
  loadRepoMigrations,
  resolveMigrationsFolder,
} from "./migrations/metadata.js";

interface AppliedMigrationRow {
  id: number;
  hash: string;
  created_at: string;
}

interface ExistingObjectRow {
  name: string;
}

async function loadAppliedMigrations(databaseUrl: string): Promise<AppliedMigrationRow[]> {
  const sql = postgres(databaseUrl);

  try {
    return await sql<AppliedMigrationRow[]>`
      select id, hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at asc
    `;
  } finally {
    await sql.end();
  }
}

async function loadExistingObjectNames(
  databaseUrl: string,
  type: "tables" | "indexes",
  names: string[],
): Promise<string[]> {
  if (names.length === 0) return [];

  const sql = postgres(databaseUrl);

  try {
    const rows =
      type === "tables"
        ? await sql<ExistingObjectRow[]>`
            select table_name as name
            from information_schema.tables
            where table_schema = 'public'
              and table_name in ${sql(names)}
          `
        : await sql<ExistingObjectRow[]>`
            select indexname as name
            from pg_indexes
            where schemaname = 'public'
              and indexname in ${sql(names)}
          `;

    return rows.map((row) => row.name);
  } finally {
    await sql.end();
  }
}

function formatMigrationRef(tag: string, when: number) {
  return `${tag} (${when})`;
}

async function runDoctor() {
  const migrationsFolder = resolveMigrationsFolder();
  const repoMigrations = loadRepoMigrations(migrationsFolder);
  const databaseUrl = getMigratorDatabaseUrl(env);

  logger.info({ folder: migrationsFolder }, "running db doctor");

  for (let index = 1; index < repoMigrations.length; index++) {
    const previous = repoMigrations[index - 1];
    const current = repoMigrations[index];

    if (current.when <= previous.when) {
      throw new Error(
        [
          "repo migration journal is not strictly monotonic:",
          `${current.tag} (${current.when})`,
          `comes after ${previous.tag} (${previous.when})`,
        ].join(" "),
      );
    }
  }

  const applied = await loadAppliedMigrations(databaseUrl);

  if (applied.length > repoMigrations.length) {
    throw new Error(
      `database has ${applied.length} applied migrations, repo only knows ${repoMigrations.length}`,
    );
  }

  for (const [index, appliedRow] of applied.entries()) {
    const repoMigration = repoMigrations[index];
    if (!repoMigration) {
      throw new Error(`database migration ${appliedRow.id} has no matching repo entry`);
    }

    if (Number(appliedRow.created_at) !== repoMigration.when) {
      throw new Error(
        [
          "migration history drift detected:",
          `database entry ${appliedRow.id} has created_at=${appliedRow.created_at}`,
          `repo expects ${formatMigrationRef(repoMigration.tag, repoMigration.when)}`,
        ].join(" "),
      );
    }

    if (appliedRow.hash !== repoMigration.hash) {
      throw new Error(
        [
          "migration hash drift detected:",
          `database entry ${appliedRow.id} for ${formatMigrationRef(repoMigration.tag, repoMigration.when)}`,
          `has hash ${appliedRow.hash}, repo has ${repoMigration.hash}`,
        ].join(" "),
      );
    }
  }

  const pending = repoMigrations.slice(applied.length);
  const pendingTables = [...new Set(pending.flatMap((migration) => migration.createdTables))];
  const pendingIndexes = [...new Set(pending.flatMap((migration) => migration.createdIndexes))];

  const [existingPendingTables, existingPendingIndexes] = await Promise.all([
    loadExistingObjectNames(databaseUrl, "tables", pendingTables),
    loadExistingObjectNames(databaseUrl, "indexes", pendingIndexes),
  ]);

  if (existingPendingTables.length > 0 || existingPendingIndexes.length > 0) {
    const details = [
      existingPendingTables.length > 0
        ? `tables already exist before their pending migrations: ${existingPendingTables.join(", ")}`
        : null,
      existingPendingIndexes.length > 0
        ? `indexes already exist before their pending migrations: ${existingPendingIndexes.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    throw new Error(`schema drift detected: ${details}`);
  }

  logger.info(
    {
      appliedMigrations: applied.length,
      pendingMigrations: pending.length,
    },
    "db doctor passed",
  );
}

runDoctor().catch((err) => {
  logger.fatal({ err }, "db doctor failed");
  process.exit(1);
});
