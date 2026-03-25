import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** A single entry from the Drizzle migration journal (`_journal.json`). */
export interface MigrationJournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationJournalEntry[];
}

/** Extended migration metadata including file path, SHA-256 hash, and parsed schema changes. */
export interface RepoMigration extends MigrationJournalEntry {
  fileName: string;
  filePath: string;
  hash: string;
  createdColumns: Array<{ tableName: string; columnName: string }>;
  createdTables: string[];
  createdIndexes: string[];
}

const ADD_COLUMN_RE = /^ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)"/gm;
const CREATE_TABLE_RE = /^CREATE TABLE "([^"]+)"/gm;
const CREATE_INDEX_RE = /^CREATE INDEX "([^"]+)"/gm;

/**
 * Resolves the absolute path to the Drizzle migrations folder by checking well-known locations.
 *
 * @throws {Error} When no folder containing `meta/_journal.json` is found.
 * @returns Absolute path to the migrations folder.
 */
export function resolveMigrationsFolder(): string {
  const candidates = [
    path.resolve(__dirname, "..", "drizzle"),
    path.resolve(__dirname, "..", "..", "drizzle"),
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
 * Returns the database URL to be used by the migrator.
 *
 * @param env - Object with `DATABASE_URL` and `DATABASE_URL_MIGRATOR` fields.
 * @returns The migrator-specific database URL.
 */
export function getMigratorDatabaseUrl(env: { DATABASE_URL: string; DATABASE_URL_MIGRATOR: string }) {
  return env.DATABASE_URL_MIGRATOR;
}

/**
 * Reads the Drizzle migration journal and all SQL files from disk.
 *
 * Parses each migration for created tables, columns, and indexes.
 *
 * @param migrationsFolder - Absolute path to the migrations folder.
 * @returns Array of `RepoMigration` objects in journal order.
 */
export function loadRepoMigrations(migrationsFolder: string): RepoMigration[] {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as MigrationJournal;

  return journal.entries.map((entry) => {
    const fileName = `${entry.tag}.sql`;
    const filePath = path.join(migrationsFolder, fileName);
    const sql = readFileSync(filePath, "utf8");

    return {
      ...entry,
      fileName,
      filePath,
      hash: createHash("sha256").update(sql).digest("hex"),
      createdColumns: [...sql.matchAll(ADD_COLUMN_RE)].map((match) => ({
        tableName: match[1],
        columnName: match[2],
      })),
      createdTables: [...sql.matchAll(CREATE_TABLE_RE)].map((match) => match[1]),
      createdIndexes: [...sql.matchAll(CREATE_INDEX_RE)].map((match) => match[1]),
    };
  });
}
