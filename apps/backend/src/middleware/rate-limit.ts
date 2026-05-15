import { isIP } from "node:net";

import { eq, lt } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { env } from "../config/env.js";
import { db } from "../db/client.js";
import { rateLimitEntries } from "../db/schema.js";
import { fail } from "../lib/http.js";
import { logger } from "../lib/logger.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface TrustedProxyConfig {
  trustedHeader: "cf-connecting-ip" | "x-real-ip" | "x-forwarded-for";
  trustedHops: number;
}

interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined | Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  entries?(): IterableIterator<[string, RateLimitEntry]>;
  purgeExpired?(before: number): number | Promise<number>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly entriesMap = new Map<string, RateLimitEntry>();

  get(key: string) {
    return this.entriesMap.get(key);
  }

  set(key: string, entry: RateLimitEntry) {
    this.entriesMap.set(key, entry);
  }

  delete(key: string) {
    this.entriesMap.delete(key);
  }

  entries() {
    return this.entriesMap.entries();
  }

  purgeExpired(before: number) {
    let purged = 0;
    for (const [key, entry] of this.entriesMap.entries()) {
      if (entry.resetAt < before) {
        this.entriesMap.delete(key);
        purged++;
      }
    }
    return purged;
  }
}

class DatabaseRateLimitStore implements RateLimitStore {
  async get(key: string) {
    const [row] = await db
      .select({
        count: rateLimitEntries.count,
        resetAt: rateLimitEntries.resetAt,
      })
      .from(rateLimitEntries)
      .where(eq(rateLimitEntries.key, key))
      .limit(1);
    return row ? { count: row.count, resetAt: row.resetAt.getTime() } : undefined;
  }

  async set(key: string, entry: RateLimitEntry) {
    await db
      .insert(rateLimitEntries)
      .values({
        key,
        count: entry.count,
        resetAt: new Date(entry.resetAt),
      })
      .onConflictDoUpdate({
        target: rateLimitEntries.key,
        set: {
          count: entry.count,
          resetAt: new Date(entry.resetAt),
        },
      });
  }

  async delete(key: string) {
    await db.delete(rateLimitEntries).where(eq(rateLimitEntries.key, key));
  }

  async purgeExpired(before: number) {
    const deleted = await db
      .delete(rateLimitEntries)
      .where(lt(rateLimitEntries.resetAt, new Date(before)))
      .returning({ key: rateLimitEntries.key });
    return deleted.length;
  }
}

const defaultRateLimitStore =
  env.NODE_ENV === "production" ? new DatabaseRateLimitStore() : new MemoryRateLimitStore();

/** Resolves the trusted client IP from the configured proxy header strategy. */
export function resolveClientIp(
  headers: Headers,
  config: TrustedProxyConfig = {
    trustedHeader: env.TRUST_PROXY_IP_HEADER,
    trustedHops: env.TRUST_PROXY_HOPS,
  },
): string {
  if (env.NODE_ENV === "production") {
    const ip = headers.get("CF-Connecting-IP")?.trim() || "";
    if (ip && isIP(ip)) return ip;
    logger.warn(
      { trustedHeader: "cf-connecting-ip" },
      "missing or invalid trusted proxy IP header",
    );
    return "unknown";
  }

  switch (config.trustedHeader) {
    case "cf-connecting-ip": {
      const ip = headers.get("CF-Connecting-IP")?.trim() || "";
      if (ip && isIP(ip)) return ip;
      return "unknown";
    }
    case "x-real-ip": {
      const ip = headers.get("X-Real-IP")?.trim() || "";
      if (ip && isIP(ip)) return ip;
      return "unknown";
    }
    case "x-forwarded-for": {
      const xForwardedFor = headers.get("X-Forwarded-For");
      if (!xForwardedFor) return "unknown";

      const hops: string[] = [];
      for (const part of xForwardedFor.split(",")) {
        const ip = part.trim();
        if (ip && isIP(ip)) hops.push(ip);
      }
      if (hops.length === 0) return "unknown";

      const trustedIndex = Math.max(0, hops.length - config.trustedHops - 1);
      return hops[trustedIndex] ?? hops[0] ?? "unknown";
    }
  }
}

/** Starts periodic cleanup of expired rate-limit entries. Returns the timer for shutdown. */
export function startRateLimitCleanupJob(): NodeJS.Timeout {
  logger.info(
    {
      store: defaultRateLimitStore.constructor.name,
      trustedHeader: env.NODE_ENV === "production" ? "cf-connecting-ip" : env.TRUST_PROXY_IP_HEADER,
      trustedProxyHops: env.NODE_ENV === "production" ? 0 : env.TRUST_PROXY_HOPS,
    },
    "rate-limit cleanup job configured",
  );
  const intervalMs = env.RATE_LIMIT_CLEANUP_INTERVAL_MS;

  const timer = setInterval(() => {
    const now = Date.now();
    void (async () => {
      const purged = defaultRateLimitStore.purgeExpired
        ? await defaultRateLimitStore.purgeExpired(now)
        : defaultRateLimitStore instanceof MemoryRateLimitStore
          ? (() => {
              let removed = 0;
              for (const [key, entry] of defaultRateLimitStore.entries()) {
                if (entry.resetAt < now) {
                  void defaultRateLimitStore.delete(key);
                  removed++;
                }
              }
              return removed;
            })()
          : 0;

      if (purged > 0) {
        logger.info({ purged }, "rate-limit cleanup: purged expired entries");
      }
    })().catch((err) => {
      logger.error({ err }, "rate-limit cleanup failed");
    });
  }, intervalMs);

  logger.info({ intervalMs }, "rate-limit cleanup job started");
  return timer;
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
 * - Default store is process-local memory. Pass a shared store (for example Redis)
 *   when running multiple backend instances.
 * - Expired entries are cleaned up by a background interval.
 */
export function rateLimit(options: { max: number; windowMs: number; store?: RateLimitStore }) {
  const store = options.store ?? defaultRateLimitStore;

  return createMiddleware(async (c, next) => {
    const ip = resolveClientIp(c.req.raw.headers);

    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = (await store.get(key)) ?? { count: 0, resetAt: now + options.windowMs };

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
    await store.set(key, entry);
    c.header("X-RateLimit-Limit", String(options.max));
    c.header("X-RateLimit-Remaining", String(Math.max(options.max - entry.count, 0)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    return next();
  });
}
