export interface MigrationIdentity {
  currentRole: string;
  expectedRole?: string;
  host: string;
  isSuperuser: boolean;
}

export interface TableOwnershipMismatch {
  owner: string;
  tableName: string;
}

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertSafeMigrationIdentity(identity: MigrationIdentity): void {
  if (LOCAL_DATABASE_HOSTS.has(identity.host)) return;

  if (!identity.expectedRole) {
    throw new Error("DB_MIGRATION_ROLE is required for migrations against a remote database");
  }

  if (identity.isSuperuser || identity.currentRole === "postgres") {
    throw new Error(
      `Refusing remote migration as superuser role "${identity.currentRole}". Expected role "${identity.expectedRole}".`,
    );
  }

  if (identity.currentRole !== identity.expectedRole) {
    throw new Error(
      `Refusing remote migration as unexpected role "${identity.currentRole}". Expected role "${identity.expectedRole}".`,
    );
  }
}

export function assertApplicationTableOwnership(rows: TableOwnershipMismatch[], expectedRole: string): void {
  if (rows.length === 0) return;
  const details = rows.map((row) => `${row.tableName} owned by ${row.owner}`).join(", ");
  throw new Error(`Application table ownership mismatch for expected role "${expectedRole}": ${details}`);
}

export async function assertSafeMigrationConnection(
  sql: {
    unsafe<T extends unknown[]>(query: string): Promise<T>;
  },
  databaseUrl: string,
  expectedRole: string | undefined,
): Promise<void> {
  const host = new URL(databaseUrl).hostname;
  const rows = await sql.unsafe<Array<{ currentRole: string; isSuperuser: boolean }>>(
    `SELECT current_user AS "currentRole",
            COALESCE((SELECT rolsuper FROM pg_roles WHERE rolname = current_user), false) AS "isSuperuser"`,
  );
  const identity = rows[0];
  if (!identity) throw new Error("Could not determine PostgreSQL migration identity");

  assertSafeMigrationIdentity({ ...identity, expectedRole, host });
}

export async function assertMigrationTableOwnership(
  sql: { unsafe<T extends unknown[]>(query: string): Promise<T> },
  expectedRole: string,
): Promise<void> {
  const rows = await sql.unsafe<TableOwnershipMismatch[]>(
    `SELECT target.relname AS "tableName", owner_role.rolname AS owner
       FROM pg_class target
       JOIN pg_namespace namespace ON namespace.oid = target.relnamespace
       JOIN pg_roles owner_role ON owner_role.oid = target.relowner
      WHERE namespace.nspname = 'public'
        AND target.relkind IN ('r', 'p')
        AND owner_role.rolname <> current_user
      ORDER BY target.relname`,
  );
  assertApplicationTableOwnership(rows, expectedRole);
}
