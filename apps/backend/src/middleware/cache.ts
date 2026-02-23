/**
 * Generic in-memory caching middleware for Hono
 * Caches responses for configurable TTL
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Create a cache middleware for a specific route/resource
 * @param options Configuration for caching behavior
 * @returns Hono middleware function
 */
export function createCacheMiddleware<T>(options: {
  ttlMs: number;
  key: (c: any) => string;
}) {
  return async (c: any, next: any) => {
    const cacheKey = options.key(c);
    const cached = cache.get(cacheKey);

    // Check if cached entry is still valid
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      c.header("X-Cache", "HIT");
      return c.json({ data: cached.data });
    }

    // Proceed to next middleware
    await next();
  };
}

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

// Start periodic cleanup of expired cache entries (every 10 minutes)
if (typeof global !== "undefined") {
  const cleanupIntervalMs = Number(
    process.env.CACHE_CLEANUP_INTERVAL_MS ?? 10 * 60 * 1000
  );

  setInterval(() => {
    const now = Date.now();
    let purged = 0;

    for (const [key, entry] of cache.entries()) {
      // Keep entries for 2x their TTL to avoid aggressive cleanup
      if (now - entry.cachedAt > entry.ttlMs * 2) {
        cache.delete(key);
        purged++;
      }
    }

    if (purged > 0) {
      console.log(`[Cache] Purged ${purged} expired entries`);
    }
  }, cleanupIntervalMs);
}
