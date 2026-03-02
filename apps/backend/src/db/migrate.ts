import { runMigrations } from "./run-migrations.js";

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
