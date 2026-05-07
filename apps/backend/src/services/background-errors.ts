import { logger } from "../lib/logger.js";
import { insertBackgroundError } from "../repositories/background-errors.js";

/**
 * Records an async background error to the database and logs it to stdout.
 *
 * Never throws — if the DB write fails, falls back to logger.error only.
 *
 * @param source - Caller identifier, e.g. "mastodon-post" or "shop-reminders".
 * @param error - The caught error value (any type).
 * @param context - Optional key/value context attached to the log entry.
 */
export async function recordBackgroundError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ err: error, source, ...context }, "background error recorded");
  try {
    await insertBackgroundError({ source, message, context: context ?? null });
  } catch (insertErr) {
    logger.error({ err: insertErr, source, message }, "failed to persist background error");
  }
}
