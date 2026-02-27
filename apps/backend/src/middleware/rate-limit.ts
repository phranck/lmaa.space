import { createMiddleware } from "hono/factory";
import { env } from "../config/env.js";
import { fail } from "../lib/http.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function resolveClientIp(headers: Headers): string {
  const cfIp = headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp.trim();

  const xRealIp = headers.get("X-Real-IP");
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = headers.get("X-Forwarded-For");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0];
    if (first) return first.trim();
  }

  return "unknown";
}

// Start periodic cleanup of expired entries (every 5 minutes by default)
if (typeof global !== "undefined") {
  const cleanupIntervalMs = env.RATE_LIMIT_CLEANUP_INTERVAL_MS;

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

/**
 * Creates in-memory IP/path based rate limiting middleware.
 *
 * @param options - Rate limit configuration.
 * @param options.max - Maximum number of requests within the window.
 * @param options.windowMs - Window duration in milliseconds.
 * @returns Hono middleware that enforces limits and sets standard rate-limit headers.
 *
 * @remarks
 * Hidden behavior:
 * - Keying strategy is `"{path}:{clientIp}"`.
 * - Store is process-local memory (not shared across instances).
 * - Expired entries are cleaned up by a background interval.
 */
export function rateLimit(options: { max: number; windowMs: number }) {
  return createMiddleware(async (c, next) => {
    const ip = resolveClientIp(c.req.raw.headers);

    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = store.get(key) ?? { count: 0, resetAt: now + options.windowMs };

    if (entry.resetAt < now) {
      entry.count = 0;
      entry.resetAt = now + options.windowMs;
    }

    if (entry.count >= options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      c.header("X-RateLimit-Limit", String(options.max));
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
      c.header("Retry-After", String(retryAfterSec));
      return fail(c, 429, "Too many requests");
    }

    entry.count++;
    store.set(key, entry);
    c.header("X-RateLimit-Limit", String(options.max));
    c.header("X-RateLimit-Remaining", String(Math.max(options.max - entry.count, 0)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    return next();
  });
}
