/**
 * Generic in-memory caching middleware for Hono
 * Caches responses for configurable TTL
 */

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

// TODO: Replace with Redis for multi-instance
const cache = new Map<string, CacheEntry<unknown>>();

/** Shared cache key for the public shops listing. */
export const SHOPS_CACHE_KEY = "shops:all";

/**
 * Cache a response in memory
 * @param key Cache key
 * @param data Data to cache
 * @param ttlMs Time to live in milliseconds
 */
export function setCacheEntry<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, {
    data,
    cachedAt: Date.now(),
    ttlMs,
  });
}

/**
 * Retrieve cached entry if still valid
 * @param key Cache key
 * @returns Cached data or undefined if expired/missing
 */
export function getCacheEntry<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) return undefined;

  // Check if expired
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    cache.delete(key);
    return undefined;
  }

  return entry.data as T;
}

/**
 * Invalidate a cache entry
 * @param key Cache key to remove
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Get current cache statistics (dev only)
 */
export function getCacheStats() {
  return {
    entries: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/** Starts periodic cleanup of expired cache entries. Returns the timer for shutdown. */
export function startCacheCleanupJob(): NodeJS.Timeout {
  if (env.NODE_ENV === "production") {
    logger.warn("in-memory cache is not shared across instances — consider Redis");
  }
  const intervalMs = env.CACHE_CLEANUP_INTERVAL_MS;

  const timer = setInterval(() => {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of cache.entries()) {
      if (now - entry.cachedAt > entry.ttlMs * 2) {
        cache.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      logger.info({ purged }, "cache cleanup: purged expired entries");
    }
  }, intervalMs);

  logger.info({ intervalMs }, "cache cleanup job started");
  return timer;
}
