import { runMigrations } from "./run-migrations.js";
import { logger } from "../lib/logger.js";

runMigrations().catch((err) => {
  logger.fatal({ err }, "migration failed");
  process.exit(1);
});
