import { beforeEach, describe, expect, it, vi } from "vitest";

const publicRepoMocks = vi.hoisted(() => ({
  countPendingSubmissions: vi.fn(),
  countPublicRejectedShops: vi.fn(),
  countPublicShops: vi.fn(),
  findPendingSubmissionByDomain: vi.fn(),
  findRejectedSubmissionByDomain: vi.fn(),
  findShopByDomain: vi.fn(),
  getFullPublicShopById: vi.fn(),
  getPublicCategoryBySlug: vi.fn(),
  getPublicShopById: vi.fn(),
  getPublishedContentPageBySlug: vi.fn(),
  getRejectionPageByToken: vi.fn(),
  insertDeadLinkReport: vi.fn(),
  insertShopConcernReport: vi.fn(),
  listAllPublicShopsWithCategories: vi.fn(),
  listPublicRejectedShops: vi.fn(),
  listPublicCategoriesWithShopCount: vi.fn(),
  listPublicNavItems: vi.fn(),
  listPublicShopsByCategoryId: vi.fn(),
  listPublishedContentPages: vi.fn(),
  searchPublicCategoriesByEscapedQuery: vi.fn(),
  searchPublicShops: vi.fn(),
  setShopLikeState: vi.fn(),
}));

const filteredRepoMocks = vi.hoisted(() => ({
  listAvailableFilterCountries: vi.fn(),
  listFilteredCategoriesWithCount: vi.fn(),
  listFilteredPublicShops: vi.fn(),
  listFilteredShopsByCategoryId: vi.fn(),
  searchFilteredPublicShops: vi.fn(),
}));

const headquartersMocks = vi.hoisted(() => ({
  loadShopHeadquartersMap: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  SHOPS_CACHE_KEY: "shops:all",
  getCacheEntry: vi.fn(),
  getCacheStats: vi.fn(),
  setCacheEntry: vi.fn(),
  invalidateCache: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: { NODE_ENV: "development", IP_HASH_SALT: "test-salt-1234567890" },
}));

const appSettingsMocks = vi.hoisted(() => ({
  getSetting: vi.fn(),
}));

vi.mock("../repositories/public.js", () => publicRepoMocks);
vi.mock("../repositories/public-filtered.js", () => filteredRepoMocks);
vi.mock("../repositories/headquarters.js", () => headquartersMocks);
vi.mock("../repositories/app-settings.js", () => appSettingsMocks);
vi.mock("../middleware/cache.js", () => cacheMocks);
vi.mock("../config/env.js", () => envMock);
vi.mock("../lib/result.js", async (importOriginal) => importOriginal());

import { matchesDomainAlertRule } from "../services/domain-alert-rules.js";
import {
  createManagedDeadLinkReport,
  createManagedShopConcernReport,
  getFilteredPublicCategoryBySlug,
  getManagedPublicCacheStats,
  getManagedPublicCategoryBySlug,
  getManagedPublicRejectedShops,
  getManagedPublicShopById,
  getManagedPublicShops,
  getManagedPublicStats,
  getPublicFilterOptions,
  hashIp,
  normalizeShopHostname,
  searchFilteredPublicCatalog,
  searchManagedPublicCatalog,
  toggleShopLike,
  validateShopUrl,
} from "../services/public.js";

const DOMAIN_ALERT_MESSAGE =
  "Da hatte wohl jemand bereits die gleiche Idee! Der Shop [Amazon](https://www.youtube.com/watch?v=dQw4w9WgXcQ) ist schon eingetragen.";

function mockAmazonDomainAlertRule() {
  appSettingsMocks.getSetting.mockResolvedValue(
    JSON.stringify({
      rules: [
        {
          id: "amazon-rickroll",
          name: "Amazon URLs",
          domainsText: "amazon.de, amazon.com, amazon.co.uk, amzn.to, amzn.eu",
          messageMarkdown: DOMAIN_ALERT_MESSAGE,
          isActive: true,
        },
      ],
    }),
  );
}

describe("normalizeShopHostname", () => {
  it("extracts root domain from full URL", () => {
    expect(normalizeShopHostname("https://www.example.com/path")).toBe("example.com");
  });

  it("adds protocol when missing", () => {
    expect(normalizeShopHostname("example.com")).toBe("example.com");
  });

  it("returns null for invalid input", () => {
    expect(normalizeShopHostname("not-a-domain")).toBeNull();
  });
});

describe("hashIp", () => {
  it("returns consistent hash", () => {
    const a = hashIp("127.0.0.1");
    const b = hashIp("127.0.0.1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns different hashes for different IPs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("5.6.7.8"));
  });
});

describe("getManagedPublicStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns shop count and pending review count", async () => {
    publicRepoMocks.countPublicShops.mockResolvedValue(42);
    publicRepoMocks.countPendingSubmissions.mockResolvedValue(7);
    const result = await getManagedPublicStats();
    expect(result).toEqual({ shopCount: 42, pendingReviewCount: 7 });
  });
});

describe("getManagedPublicCategoryBySlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns failure when category not found", async () => {
    publicRepoMocks.getPublicCategoryBySlug.mockResolvedValue(null);
    const result = await getManagedPublicCategoryBySlug("unknown");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns category with shops", async () => {
    publicRepoMocks.getPublicCategoryBySlug.mockResolvedValue({
      id: 1,
      name: "Mode",
      slug: "mode",
    });
    publicRepoMocks.listPublicShopsByCategoryId.mockResolvedValue([{ id: 10, name: "Shop A" }]);

    const result = await getManagedPublicCategoryBySlug("mode");

    expect(result).toEqual({
      ok: true,
      data: { id: 1, name: "Mode", slug: "mode", shops: [{ id: 10, name: "Shop A" }] },
    });
  });
});

describe("getManagedPublicShopById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns failure when shop not found", async () => {
    publicRepoMocks.getFullPublicShopById.mockResolvedValue(null);
    const result = await getManagedPublicShopById(99);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns shop with headquarters data", async () => {
    publicRepoMocks.getFullPublicShopById.mockResolvedValue({ id: 1, name: "Shop" });
    headquartersMocks.loadShopHeadquartersMap.mockResolvedValue(
      new Map([[1, { city: "Berlin", country: "DE" }]]),
    );

    const result = await getManagedPublicShopById(1);

    expect(result).toEqual({
      ok: true,
      data: {
        id: 1,
        name: "Shop",
        headquarters: { city: "Berlin", country: "DE" },
        likeToken: expect.stringMatching(/^[a-f0-9]+\.\d+$/),
      },
    });
  });

  it("returns null headquarters when not available", async () => {
    publicRepoMocks.getFullPublicShopById.mockResolvedValue({ id: 2, name: "Shop" });
    headquartersMocks.loadShopHeadquartersMap.mockResolvedValue(new Map());

    const result = await getManagedPublicShopById(2);

    expect(result).toEqual({
      ok: true,
      data: {
        id: 2,
        name: "Shop",
        headquarters: null,
        likeToken: expect.stringMatching(/^[a-f0-9]+\.\d+$/),
      },
    });
  });
});

describe("toggleShopLike", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid token before touching like state", async () => {
    const result = await toggleShopLike(1, true, "invalid", "fingerprint-123456", "127.0.0.1");

    expect(result).toEqual({ ok: false, reason: "invalid_token" });
    expect(publicRepoMocks.setShopLikeState).not.toHaveBeenCalled();
  });

  it("sets idempotent like state using a server-derived visitor key", async () => {
    publicRepoMocks.getFullPublicShopById.mockResolvedValue({ id: 1, name: "Shop" });
    headquartersMocks.loadShopHeadquartersMap.mockResolvedValue(new Map());

    const shop = await getManagedPublicShopById(1);
    const token = shop.ok ? shop.data.likeToken : "";
    publicRepoMocks.setShopLikeState.mockResolvedValue("liked");

    const result = await toggleShopLike(1, true, token, "fingerprint-123456", "127.0.0.1");

    expect(result).toEqual({ ok: true });
    expect(publicRepoMocks.setShopLikeState).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      true,
    );
  });

  it("returns not_found when the repository cannot find a public shop", async () => {
    publicRepoMocks.getFullPublicShopById.mockResolvedValue({ id: 1, name: "Shop" });
    headquartersMocks.loadShopHeadquartersMap.mockResolvedValue(new Map());

    const shop = await getManagedPublicShopById(1);
    const token = shop.ok ? shop.data.likeToken : "";
    publicRepoMocks.setShopLikeState.mockResolvedValue("not_found");

    const result = await toggleShopLike(1, false, token, "fingerprint-123456", "127.0.0.1");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("getManagedPublicShops", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached data on HIT", async () => {
    cacheMocks.getCacheEntry.mockReturnValue([{ id: 1 }]);

    const result = await getManagedPublicShops();

    expect(result).toEqual({ cache: "HIT", data: [{ id: 1 }] });
    expect(publicRepoMocks.listAllPublicShopsWithCategories).not.toHaveBeenCalled();
  });

  it("fetches and caches on MISS", async () => {
    cacheMocks.getCacheEntry.mockReturnValue(undefined);
    publicRepoMocks.listAllPublicShopsWithCategories.mockResolvedValue([{ id: 1 }]);

    const result = await getManagedPublicShops();

    expect(result).toEqual({ cache: "MISS", data: [{ id: 1 }] });
    expect(cacheMocks.setCacheEntry).toHaveBeenCalledWith("shops:all", [{ id: 1 }], 60000);
  });
});

describe("searchManagedPublicCatalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty result for short query", async () => {
    const result = await searchManagedPublicCatalog("a");
    expect(result).toEqual({ shops: [], categories: [], query: "a", total: 0 });
  });

  it("returns empty result for undefined query", async () => {
    const result = await searchManagedPublicCatalog(undefined);
    expect(result).toEqual({ shops: [], categories: [], query: "", total: 0 });
  });

  it("searches shops and categories", async () => {
    publicRepoMocks.searchPublicShops.mockResolvedValue([{ id: 1, name: "Fair Shop" }]);
    publicRepoMocks.searchPublicCategoriesByEscapedQuery.mockResolvedValue([
      { id: 2, name: "Fair Fashion" },
    ]);

    const result = await searchManagedPublicCatalog("fair");

    expect(result).toEqual({
      shops: [{ id: 1, name: "Fair Shop" }],
      categories: [{ id: 2, name: "Fair Fashion" }],
      query: "fair",
      total: 2,
    });
    expect(publicRepoMocks.searchPublicShops).toHaveBeenCalledWith("fair", {
      postalCodePrefix: null,
    });
  });

  it("forwards a postal code prefix when the query looks like a European postal code", async () => {
    publicRepoMocks.searchPublicShops.mockResolvedValue([]);
    publicRepoMocks.searchPublicCategoriesByEscapedQuery.mockResolvedValue([]);

    await searchManagedPublicCatalog("77716");

    expect(publicRepoMocks.searchPublicShops).toHaveBeenCalledWith("77716", {
      postalCodePrefix: "77716",
    });
  });

  it("escapes special SQL characters in category search", async () => {
    publicRepoMocks.searchPublicShops.mockResolvedValue([]);
    publicRepoMocks.searchPublicCategoriesByEscapedQuery.mockResolvedValue([]);

    await searchManagedPublicCatalog("100%_off");

    expect(publicRepoMocks.searchPublicCategoriesByEscapedQuery).toHaveBeenCalledWith(
      "100\\%\\_off",
    );
  });
});

describe("matchesDomainAlertRule", () => {
  const rule = {
    id: "amazon-rickroll",
    name: "Amazon URLs",
    domainsText: "amazon.de, amazon.com, amazon.co.uk, amzn.to, amzn.eu",
    messageMarkdown: DOMAIN_ALERT_MESSAGE,
    isActive: true,
  };

  it("matches configured domains and subdomains", () => {
    expect(matchesDomainAlertRule("amazon.de", "amazon.de", rule)).toBe(true);
    expect(matchesDomainAlertRule("kindle.amazon.de", "amazon.de", rule)).toBe(true);
    expect(matchesDomainAlertRule("smile.amazon.com", "amazon.com", rule)).toBe(true);
  });

  it("matches configured shortener domains", () => {
    expect(matchesDomainAlertRule("amzn.to", "amzn.to", rule)).toBe(true);
    expect(matchesDomainAlertRule("www.amzn.eu", "amzn.eu", rule)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(matchesDomainAlertRule("AMAZON.DE", "amazon.de", rule)).toBe(true);
  });

  it("does not match unrelated domains containing the configured label", () => {
    expect(matchesDomainAlertRule("notamazon.com", "notamazon.com", rule)).toBe(false);
    expect(matchesDomainAlertRule("amazon.example.com", "example.com", rule)).toBe(false);
    expect(matchesDomainAlertRule("example.com", "example.com", rule)).toBe(false);
  });

  it("ignores disabled rules", () => {
    expect(
      matchesDomainAlertRule("amazon.de", "amazon.de", {
        ...rule,
        isActive: false,
      }),
    ).toBe(false);
  });
});

describe("validateShopUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettingsMocks.getSetting.mockResolvedValue(null);
  });

  it("returns available for empty URL", async () => {
    const result = await validateShopUrl(undefined);
    expect(result).toEqual({ status: "available" });
  });

  it("returns published with detail link when shop exists", async () => {
    publicRepoMocks.findShopByDomain.mockResolvedValue({
      id: 42,
      name: "Shop",
      visibility: "public",
    });

    const result = await validateShopUrl("https://shop.de");

    expect(result).toEqual({
      status: "published",
      shopName: "Shop",
      shopUrl: expect.stringMatching(/^\/shop\/[a-z0-9]+$/),
    });
  });

  it("returns blocked with configured alert for matching domains without DB lookup", async () => {
    mockAmazonDomainAlertRule();

    const result = await validateShopUrl("https://www.amazon.de/dp/B000123");

    expect(result).toEqual({
      status: "blocked",
      messageMarkdown: DOMAIN_ALERT_MESSAGE,
    });
    expect(publicRepoMocks.findShopByDomain).not.toHaveBeenCalled();
    expect(publicRepoMocks.findRejectedSubmissionByDomain).not.toHaveBeenCalled();
    expect(publicRepoMocks.findPendingSubmissionByDomain).not.toHaveBeenCalled();
  });

  it("returns blocked with configured alert for short links", async () => {
    mockAmazonDomainAlertRule();

    const result = await validateShopUrl("https://amzn.to/3xyz");

    expect(result).toEqual({
      status: "blocked",
      messageMarkdown: DOMAIN_ALERT_MESSAGE,
    });
  });

  it("returns rejected with URL when shop is rejected", async () => {
    publicRepoMocks.findShopByDomain.mockResolvedValue({
      name: "Bad Shop",
      visibility: "rejected",
      rejectionToken: "abc123",
    });

    const result = await validateShopUrl("https://badshop.de");

    expect(result).toEqual({
      status: "rejected",
      shopName: "Bad Shop",
      rejectionUrl: "/rejected/abc123",
    });
  });

  it("checks submissions when no shop found", async () => {
    publicRepoMocks.findShopByDomain.mockResolvedValue(null);
    publicRepoMocks.findRejectedSubmissionByDomain.mockResolvedValue({
      shopName: "Rejected Sub",
      rejectionToken: "def456",
    });

    const result = await validateShopUrl("https://rejected.de");

    expect(result).toEqual({
      status: "rejected",
      shopName: "Rejected Sub",
      rejectionUrl: "/rejected/def456",
    });
  });

  it("returns available when nothing matches", async () => {
    publicRepoMocks.findShopByDomain.mockResolvedValue(null);
    publicRepoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);

    const result = await validateShopUrl("https://new-shop.de");

    expect(result).toEqual({ status: "available" });
  });
});

describe("createManagedDeadLinkReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when shop missing", async () => {
    publicRepoMocks.getPublicShopById.mockResolvedValue(null);
    const result = await createManagedDeadLinkReport(99, "1.2.3.4");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("inserts report with hashed IP and keeps deduplication on", async () => {
    publicRepoMocks.getPublicShopById.mockResolvedValue({ id: 1 });
    const result = await createManagedDeadLinkReport(1, "1.2.3.4");
    expect(result).toEqual({ ok: true });
    expect(publicRepoMocks.insertDeadLinkReport).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      { deduplicate: true },
    );
  });

  // Every reporter without a resolvable address hashes to the same value, so
  // deduplicating on it would keep the first report for a shop and silently
  // drop every later one.
  it("skips deduplication when the client address is unknown", async () => {
    publicRepoMocks.getPublicShopById.mockResolvedValue({ id: 1 });
    const result = await createManagedDeadLinkReport(1, "unknown");
    expect(result).toEqual({ ok: true });
    expect(publicRepoMocks.insertDeadLinkReport).toHaveBeenCalledWith(
      1,
      expect.stringMatching(/^[0-9a-f]{64}$/),
      { deduplicate: false },
    );
  });
});

describe("getManagedPublicRejectedShops", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns public rejection entries with clamped pagination", async () => {
    publicRepoMocks.countPublicRejectedShops.mockResolvedValueOnce(42).mockResolvedValueOnce(20);
    publicRepoMocks.listPublicRejectedShops.mockResolvedValue([
      {
        source: "submission",
        id: 7,
        shopName: "Bad Shop",
        ogImage: "https://example.com/logo.png",
        logoBackgroundColor: "#fafaf9",
        submittedAt: new Date("2026-01-02T10:00:00.000Z"),
        rejectedAt: new Date("2026-01-05T12:00:00.000Z"),
        rejectionToken: "a".repeat(32),
      },
    ]);

    const result = await getManagedPublicRejectedShops({
      search: " bad ",
      page: 9,
      pageSize: "15",
      sortBy: "shopName",
      sortDir: "asc",
    });

    expect(publicRepoMocks.countPublicRejectedShops).toHaveBeenNthCalledWith(1, "");
    expect(publicRepoMocks.countPublicRejectedShops).toHaveBeenNthCalledWith(2, "bad");
    expect(publicRepoMocks.listPublicRejectedShops).toHaveBeenCalledWith({
      search: "bad",
      page: 2,
      pageSize: 15,
      sortBy: "shopName",
      sortDir: "asc",
    });
    expect(result).toEqual({
      entries: [
        {
          id: "submission:7",
          shopName: "Bad Shop",
          ogImage: "https://example.com/logo.png",
          logoBackgroundColor: "#fafaf9",
          submittedAt: "2026-01-02T10:00:00.000Z",
          rejectedAt: "2026-01-05T12:00:00.000Z",
          rejectionUrl: `/rejected/${"a".repeat(32)}`,
        },
      ],
      total: 20,
      page: 2,
      pageSize: "15",
      search: "bad",
      sortBy: "shopName",
      sortDir: "asc",
      metrics: {
        totalRejectedShops: 42,
        filteredRejectedShops: 20,
      },
    });
  });
});

describe("createManagedShopConcernReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects short reasons", async () => {
    const result = await createManagedShopConcernReport(1, "short", "1.2.3.4");
    expect(result).toEqual({ ok: false, reason: "invalid_reason" });
  });

  it("returns not_found when shop missing", async () => {
    publicRepoMocks.getPublicShopById.mockResolvedValue(null);
    const result = await createManagedShopConcernReport(
      99,
      "This shop is selling fake products!",
      "1.2.3.4",
    );
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("inserts concern with trimmed reason and hashed IP", async () => {
    publicRepoMocks.getPublicShopById.mockResolvedValue({ id: 1 });
    const result = await createManagedShopConcernReport(
      1,
      "  This shop sells counterfeit items  ",
      "1.2.3.4",
    );
    expect(result).toEqual({ ok: true });
    expect(publicRepoMocks.insertShopConcernReport).toHaveBeenCalledWith(
      1,
      "This shop sells counterfeit items",
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });
});

describe("getManagedPublicCacheStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stats in development", () => {
    envMock.env.NODE_ENV = "development";
    cacheMocks.getCacheStats.mockReturnValue({ entries: 1, keys: ["shops:all"] });

    const result = getManagedPublicCacheStats();

    expect(result).toEqual({ ok: true, data: { entries: 1, keys: ["shops:all"] } });
  });

  it("returns not_available in production", () => {
    envMock.env.NODE_ENV = "production";

    const result = getManagedPublicCacheStats();

    expect(result).toEqual({ ok: false, reason: "not_available" });
    envMock.env.NODE_ENV = "development";
  });
});

describe("getFilteredPublicCategoryBySlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns failure when category not found", async () => {
    publicRepoMocks.getPublicCategoryBySlug.mockResolvedValue(null);
    const result = await getFilteredPublicCategoryBySlug("unknown", {});
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns category with filtered shops", async () => {
    publicRepoMocks.getPublicCategoryBySlug.mockResolvedValue({ id: 1, name: "Mode" });
    filteredRepoMocks.listFilteredShopsByCategoryId.mockResolvedValue([{ id: 10 }]);

    const filters = { country: "DE" };
    const result = await getFilteredPublicCategoryBySlug("mode", filters);

    expect(result).toEqual({ ok: true, data: { id: 1, name: "Mode", shops: [{ id: 10 }] } });
    expect(filteredRepoMocks.listFilteredShopsByCategoryId).toHaveBeenCalledWith(1, filters);
  });
});

describe("searchFilteredPublicCatalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty for short query", async () => {
    const result = await searchFilteredPublicCatalog("x", {});
    expect(result).toEqual({ shops: [], categories: [], query: "x", total: 0 });
  });

  it("searches with filters", async () => {
    filteredRepoMocks.searchFilteredPublicShops.mockResolvedValue([{ id: 1 }]);
    publicRepoMocks.searchPublicCategoriesByEscapedQuery.mockResolvedValue([]);

    const result = await searchFilteredPublicCatalog("fair", { country: "DE" });

    expect(result).toEqual({ shops: [{ id: 1 }], categories: [], query: "fair", total: 1 });
    expect(filteredRepoMocks.searchFilteredPublicShops).toHaveBeenCalledWith(
      "fair",
      { country: "DE" },
      { postalCodePrefix: null },
    );
  });

  it("forwards a postal code prefix when the filtered query looks like a postal code", async () => {
    filteredRepoMocks.searchFilteredPublicShops.mockResolvedValue([]);
    publicRepoMocks.searchPublicCategoriesByEscapedQuery.mockResolvedValue([]);

    await searchFilteredPublicCatalog("1234 AB", { country: "NL" });

    expect(filteredRepoMocks.searchFilteredPublicShops).toHaveBeenCalledWith(
      "1234 AB",
      { country: "NL" },
      { postalCodePrefix: "1234AB" },
    );
  });
});

describe("getPublicFilterOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns available countries", async () => {
    filteredRepoMocks.listAvailableFilterCountries.mockResolvedValue(["DE", "AT", "CH"]);
    const result = await getPublicFilterOptions();
    expect(result).toEqual({ countries: ["DE", "AT", "CH"] });
  });
});
