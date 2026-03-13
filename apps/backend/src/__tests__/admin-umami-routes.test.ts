import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

const serviceMocks = vi.hoisted(() => ({
  getManagedUmamiStats: vi.fn(),
  getManagedUmamiPageviews: vi.fn(),
  getManagedUmamiMetrics: vi.fn(),
  getManagedUmamiActive: vi.fn(),
  getManagedUmamiRealtime: vi.fn(),
  getManagedUmamiSearchTerms: vi.fn(),
  getManagedUmamiCategoryClicks: vi.fn(),
  getManagedUmamiShopVisitClicks: vi.fn(),
  getManagedUmamiShopVisitTotal: vi.fn(),
  getManagedUmamiSiteLinkClicks: vi.fn(),
  getManagedUmamiInteractionTotal: vi.fn(),
}));

vi.mock("../services/admin-umami.js", () => serviceMocks);

import { umamiRoutes } from "../routes/admin/umami.js";

describe("umamiRoutes", () => {
  const app = new Hono();
  app.route("/", umamiRoutes);

  beforeEach(() => {
    Object.values(serviceMocks).forEach((mock) => mock.mockReset());
  });

  it("serves search terms report", async () => {
    serviceMocks.getManagedUmamiSearchTerms.mockResolvedValue([{ value: "fair", total: 4 }]);

    const res = await app.request("/umami/events/search-terms?period=30d");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ value: "fair", total: 4 }] });
    expect(serviceMocks.getManagedUmamiSearchTerms).toHaveBeenCalledWith("30d");
  });

  it("serves category click report", async () => {
    serviceMocks.getManagedUmamiCategoryClicks.mockResolvedValue([{ value: "Mode", total: 6 }]);

    const res = await app.request("/umami/events/category-clicks?period=7d");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [{ value: "Mode", total: 6 }] });
    expect(serviceMocks.getManagedUmamiCategoryClicks).toHaveBeenCalledWith("7d");
  });

  it("serves shop visit totals", async () => {
    serviceMocks.getManagedUmamiShopVisitTotal.mockResolvedValue({ total: 18 });

    const res = await app.request("/umami/events/shop-visits/total?period=today");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { total: 18 } });
    expect(serviceMocks.getManagedUmamiShopVisitTotal).toHaveBeenCalledWith("today");
  });

  it("serves interaction totals", async () => {
    serviceMocks.getManagedUmamiInteractionTotal.mockResolvedValue({ total: 42 });

    const res = await app.request("/umami/events/interactions/total?period=90d");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { total: 42 } });
    expect(serviceMocks.getManagedUmamiInteractionTotal).toHaveBeenCalledWith("90d");
  });
});
