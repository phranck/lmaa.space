import { lt } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";

/**
 * Delete expired sessions from the database.
 * Runs periodically to prevent session table bloat.
 */
async function cleanupExpiredSessions(): Promise<{ purged: number }> {
  const now = new Date();

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  return { purged: result.length };
}

/**
 * Start automatic session cleanup job.
 * Runs every 1 hour (configurable via env var).
 */
export function startSessionCleanupJob(): NodeJS.Timeout {
  const intervalMs = env.SESSION_CLEANUP_INTERVAL_MS;

  const timer = setInterval(async () => {
    try {
      const { purged } = await cleanupExpiredSessions();
      if (purged > 0) {
        console.log(`[SessionCleanup] Purged ${purged} expired sessions`);
      }
    } catch (error) {
      console.error("[SessionCleanup] Error:", error);
    }
  }, intervalMs);

  console.log(`[SessionCleanup] Job started (interval: ${intervalMs}ms)`);
  return timer;
}
