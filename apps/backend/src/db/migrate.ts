import { logger } from "../lib/logger.js";
import { runMigrations } from "./run-migrations.js";

runMigrations().catch((err) => {
  logger.fatal({ err }, "migration failed");
  process.exit(1);
});
