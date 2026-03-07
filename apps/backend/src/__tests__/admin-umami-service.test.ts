import { beforeEach, describe, expect, it, vi } from "vitest";

const loggerError = vi.fn();
const periodToRange = vi.fn(() => ({ startAt: 100, endAt: 200 }));
const umamiGet = vi.fn();

async function loadServiceModule(configured = true) {
  vi.resetModules();

  vi.doMock("../services/umami.js", () => ({
    UMAMI_WEBSITE_ID: "website-123",
    normalizeUmamiMetricType: (value: string) => value,
    normalizeUmamiStats: (value: unknown) => value,
    periodToRange,
    umamiConfigured: configured,
    umamiGet,
  }));

  vi.doMock("../lib/logger.js", () => ({
    logger: { error: loggerError },
  }));

  return import("../services/admin-umami.js");
}

describe("admin-umami service", () => {
  beforeEach(() => {
    periodToRange.mockClear();
    umamiGet.mockReset();
    loggerError.mockReset();
  });

  it("maps search term queries to Umami event-data values", async () => {
    umamiGet.mockResolvedValue([
      { x: "fair fashion", y: 7 },
      { x: "", y: 0 },
    ]);
    const service = await loadServiceModule();

    await expect(service.getManagedUmamiSearchTerms("30d")).resolves.toEqual([
      { value: "fair fashion", total: 7 },
    ]);

    expect(periodToRange).toHaveBeenCalledWith("30d");
    expect(umamiGet).toHaveBeenCalledWith(
      "/websites/website-123/event-data/values?startAt=100&endAt=200&event=site-search&propertyName=query&limit=10",
    );
  });

  it("maps shop visit totals to Umami event-data events", async () => {
    umamiGet.mockResolvedValue([
      { propertyName: "shopName", total: 9 },
      { propertyName: "shopId", total: 12 },
    ]);
    const service = await loadServiceModule();

    await expect(service.getManagedUmamiShopVisitTotal("7d")).resolves.toEqual({ total: 12 });

    expect(umamiGet).toHaveBeenCalledWith(
      "/websites/website-123/event-data/events?startAt=100&endAt=200&event=shop-visit-click",
    );
  });

  it("sums interaction totals across all managed custom events", async () => {
    umamiGet
      .mockResolvedValueOnce([{ propertyName: "query", total: 3 }])
      .mockResolvedValueOnce([{ propertyName: "categoryName", total: 4 }])
      .mockResolvedValueOnce([{ propertyName: "shopId", total: 5 }])
      .mockResolvedValueOnce([{ propertyName: "href", total: 6 }]);
    const service = await loadServiceModule();

    await expect(service.getManagedUmamiInteractionTotal("today")).resolves.toEqual({
      total: 18,
    });
  });

  it("returns null without calling Umami when configuration is missing", async () => {
    const service = await loadServiceModule(false);

    await expect(service.getManagedUmamiSiteLinkClicks("30d")).resolves.toBeNull();

    expect(umamiGet).not.toHaveBeenCalled();
  });

  it("returns null and logs when Umami request fails", async () => {
    umamiGet.mockRejectedValue(new Error("boom"));
    const service = await loadServiceModule();

    await expect(service.getManagedUmamiCategoryClicks("7d")).resolves.toBeNull();

    expect(loggerError).toHaveBeenCalledTimes(1);
  });
});
