import { createMiddleware } from "hono/factory";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Start periodic cleanup of expired entries (every 5 minutes by default)
if (typeof global !== "undefined") {
  const cleanupIntervalMs =
    Number(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS ?? 5 * 60 * 1000);

  setInterval(() => {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      console.log(`[Rate Limit] Purged ${purged} expired entries`);
    }
  }, cleanupIntervalMs);
}

export function rateLimit(options: { max: number; windowMs: number }) {
  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ??
      c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
      "unknown";

    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.max) {
      return c.json({ error: { message: "Too many requests" } }, 429);
    }

    entry.count++;
    return next();
  });
}
