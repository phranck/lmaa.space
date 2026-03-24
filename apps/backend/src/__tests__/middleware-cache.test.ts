import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "development", CACHE_CLEANUP_INTERVAL_MS: 1000 },
}));
vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));

import {
  getCacheEntry,
  getCacheStats,
  invalidateCache,
  setCacheEntry,
  startCacheCleanupJob,
} from "../middleware/cache.js";

describe("cache middleware", () => {
  beforeEach(() => {
    invalidateCache("test-key");
    invalidateCache("other-key");
  });

  describe("setCacheEntry / getCacheEntry", () => {
    it("stores and retrieves data", () => {
      setCacheEntry("test-key", { foo: "bar" }, 10_000);

      const result = getCacheEntry<{ foo: string }>("test-key");

      expect(result).toEqual({ foo: "bar" });
    });

    it("returns undefined for missing keys", () => {
      expect(getCacheEntry("nonexistent")).toBeUndefined();
    });

    it("returns undefined for expired entries", () => {
      vi.useFakeTimers();
      setCacheEntry("test-key", "data", 100);

      vi.advanceTimersByTime(101);

      expect(getCacheEntry("test-key")).toBeUndefined();
      vi.useRealTimers();
    });
  });

  describe("invalidateCache", () => {
    it("removes cache entry", () => {
      setCacheEntry("test-key", "data", 10_000);
      invalidateCache("test-key");
      expect(getCacheEntry("test-key")).toBeUndefined();
    });
  });

  describe("getCacheStats", () => {
    it("returns current stats", () => {
      setCacheEntry("test-key", "a", 10_000);
      setCacheEntry("other-key", "b", 10_000);

      const stats = getCacheStats();

      expect(stats.entries).toBe(2);
      expect(stats.keys).toContain("test-key");
      expect(stats.keys).toContain("other-key");
    });
  });

  describe("startCacheCleanupJob", () => {
    afterEach(() => vi.useRealTimers());

    it("purges entries past 2x TTL", () => {
      vi.useFakeTimers();
      setCacheEntry("test-key", "data", 100);

      const timer = startCacheCleanupJob();

      // Advance past 2x TTL
      vi.advanceTimersByTime(1001);

      expect(getCacheEntry("test-key")).toBeUndefined();

      clearInterval(timer);
    });
  });
});
