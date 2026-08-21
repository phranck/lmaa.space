import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Records the order in which the migration run touches the database, so the
 * tests can assert that the advisory lock encloses Drizzle's migrate call.
 */
const callLog = vi.hoisted(() => [] as string[]);

const migratorMocks = vi.hoisted(() => ({
  migrate: vi.fn(() => {
    callLog.push("migrate");
    return Promise.resolve();
  }),
}));

const safetyMocks = vi.hoisted(() => ({
  assertMigrationTableOwnership: vi.fn(() => Promise.resolve()),
  assertSafeMigrationConnection: vi.fn(() => Promise.resolve()),
}));

const postgresMocks = vi.hoisted(() => {
  const sql = vi.fn((strings: TemplateStringsArray) => {
    callLog.push(strings.join("?").trim());
    return Promise.resolve([]);
  }) as ReturnType<typeof vi.fn> & { end: ReturnType<typeof vi.fn> };
  sql.end = vi.fn(() => Promise.resolve());
  return { sql, factory: vi.fn(() => sql) };
});

vi.mock("postgres", () => ({ default: postgresMocks.factory }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: vi.fn(() => ({})) }));
vi.mock("drizzle-orm/postgres-js/migrator", () => ({ migrate: migratorMocks.migrate }));
vi.mock("./migration-safety.js", () => safetyMocks);
vi.mock("./migrations/metadata.js", () => ({
  getMigratorDatabaseUrl: vi.fn(() => "postgres://test:test@localhost:5432/test"),
  resolveMigrationsFolder: vi.fn(() => "/tmp/migrations"),
}));
vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { runMigrations } = await import("./run-migrations.js");

describe("runMigrations", () => {
  beforeEach(() => {
    callLog.length = 0;
    vi.clearAllMocks();
    migratorMocks.migrate.mockImplementation(() => {
      callLog.push("migrate");
      return Promise.resolve();
    });
  });

  it("holds an advisory lock across the migrate call", async () => {
    await runMigrations();

    const locked = callLog.findIndex((entry) => entry.includes("pg_advisory_lock"));
    const migrated = callLog.indexOf("migrate");
    const unlocked = callLog.findIndex((entry) => entry.includes("pg_advisory_unlock"));

    expect(locked).toBeGreaterThanOrEqual(0);
    expect(migrated).toBeGreaterThan(locked);
    expect(unlocked).toBeGreaterThan(migrated);
  });

  it("releases the advisory lock when migrating fails", async () => {
    migratorMocks.migrate.mockImplementation(() => {
      callLog.push("migrate");
      return Promise.reject(new Error("relation already exists"));
    });

    await expect(runMigrations()).rejects.toThrow(/relation already exists/);

    expect(callLog.some((entry) => entry.includes("pg_advisory_unlock"))).toBe(true);
    expect(postgresMocks.sql.end).toHaveBeenCalled();
  });

  it("takes the lock only after the connection has been vetted", async () => {
    await runMigrations();

    expect(safetyMocks.assertSafeMigrationConnection).toHaveBeenCalled();
    const lockOrder = safetyMocks.assertSafeMigrationConnection.mock.invocationCallOrder[0];
    const sqlOrder = postgresMocks.sql.mock.invocationCallOrder[0];
    expect(sqlOrder).toBeGreaterThan(lockOrder);
  });
});
