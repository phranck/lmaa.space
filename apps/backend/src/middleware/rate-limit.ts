import { createMiddleware } from "hono/factory";

import { env } from "../config/env.js";
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
}

const rateLimitStore = new MemoryRateLimitStore();

/** Resolves the trusted client IP from the configured proxy header strategy. */
export function resolveClientIp(
  headers: Headers,
  config: TrustedProxyConfig = {
    trustedHeader: env.TRUST_PROXY_IP_HEADER,
    trustedHops: env.TRUST_PROXY_HOPS,
  },
): string {
  switch (config.trustedHeader) {
    case "cf-connecting-ip": {
      const ip = headers.get("CF-Connecting-IP");
      return ip?.trim() || "unknown";
    }
    case "x-real-ip": {
      const ip = headers.get("X-Real-IP");
      return ip?.trim() || "unknown";
    }
    case "x-forwarded-for": {
      const xForwardedFor = headers.get("X-Forwarded-For");
      if (!xForwardedFor) return "unknown";

      const hops = xForwardedFor
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (hops.length === 0) return "unknown";

      const trustedIndex = Math.max(0, hops.length - config.trustedHops - 1);
      return hops[trustedIndex] ?? hops[0] ?? "unknown";
    }
  }
}

/** Starts periodic cleanup of expired rate-limit entries. Returns the timer for shutdown. */
export function startRateLimitCleanupJob(): NodeJS.Timeout {
  if (env.NODE_ENV === "production") {
    logger.warn(
      {
        trustedHeader: env.TRUST_PROXY_IP_HEADER,
        trustedProxyHops: env.TRUST_PROXY_HOPS,
      },
      "rate-limit store is process-local memory; use a shared store before scaling horizontally",
    );
  }
  const intervalMs = env.RATE_LIMIT_CLEANUP_INTERVAL_MS;

  const timer = setInterval(() => {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of rateLimitStore.entries?.() ?? []) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      logger.info({ purged }, "rate-limit cleanup: purged expired entries");
    }
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
  const store = options.store ?? rateLimitStore;

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
