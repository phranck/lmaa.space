# PostgreSQL Migration Safety

Zerops sets the normal application connection for both `DATABASE_URL` and `DATABASE_URL_MIGRATOR`, plus `DB_MIGRATION_ROLE=db`.

Before `run-migrations.ts` calls Drizzle, `migration-safety.ts` queries `current_user` and `pg_roles.rolsuper`. A remote migration aborts when the expected role is missing, the connection uses `postgres` or any superuser, or the role differs from `DB_MIGRATION_ROLE`.

After Drizzle completes, the runner queries every application table in `public` and aborts if any owner differs from the connected application role. `db/doctor.ts` separately verifies migration hashes and pending-schema drift.

Local development uses the local database only. Administrative production connections must never feed the normal migration or application environment. An ownership repair requires explicit approval and documented owner/privilege checks before and after the change.
