import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "development" },
}));

const serviceMocks = vi.hoisted(() => ({
  acceptShopReview: vi.fn(),
  changeManagedAdminShopVisibility: vi.fn(),
  createManagedAdminShop: vi.fn(),
  deleteManagedAdminShop: vi.fn(),
  previewAdminShopImage: vi.fn(),
  refetchAdminShopImage: vi.fn(),
  setManagedAdminShopOgImage: vi.fn(),
  stageShopReviewData: vi.fn(),
  updateManagedAdminShop: vi.fn(),
  updateManagedAdminShopDeleteReason: vi.fn(),
}));

const repoMocks = vi.hoisted(() => ({
  getAdminShopById: vi.fn(),
  getShopVisibilityCounts: vi.fn(),
  listAdminShops: vi.fn(),
}));

vi.mock("../services/admin-shops.js", () => serviceMocks);
vi.mock("../repositories/admin-shops.js", () => repoMocks);
vi.mock("../middleware/auth.js", () => ({
  requireAdmin: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

import { shopsRoutes } from "../routes/admin/shops.js";

describe("shopsRoutes", () => {
  const app = new Hono();
  app.route("/", shopsRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /shops", () => {
    it("returns all shops", async () => {
      repoMocks.listAdminShops.mockResolvedValue([{ id: 1, name: "Shop" }]);

      const res = await app.request("/shops");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: 1, name: "Shop" }] });
    });

    it("filters by visibility", async () => {
      repoMocks.listAdminShops.mockResolvedValue([]);

      const res = await app.request("/shops?visibility=public");

      expect(res.status).toBe(200);
      expect(repoMocks.listAdminShops).toHaveBeenCalledWith("public");
    });
  });

  describe("GET /shops/counts", () => {
    it("returns visibility counts", async () => {
      repoMocks.getShopVisibilityCounts.mockResolvedValue({ public: 10, onhold: 2 });

      const res = await app.request("/shops/counts");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { public: 10, onhold: 2 } });
    });
  });

  describe("GET /shops/:id", () => {
    it("returns shop by id", async () => {
      repoMocks.getAdminShopById.mockResolvedValue({ id: 1, name: "Shop" });

      const res = await app.request("/shops/1");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 1, name: "Shop" } });
    });

    it("returns 400 for invalid id", async () => {
      const res = await app.request("/shops/abc");
      expect(res.status).toBe(400);
    });

    it("returns 404 when not found", async () => {
      repoMocks.getAdminShopById.mockResolvedValue(null);

      const res = await app.request("/shops/99");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /shops/:id/refetch-image", () => {
    it("refetches and returns new OG image", async () => {
      serviceMocks.refetchAdminShopImage.mockResolvedValue({
        ok: true,
        ogImage: "https://cdn.example.com/og.png",
      });

      const res = await app.request("/shops/1/refetch-image", { method: "POST" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { ogImage: "https://cdn.example.com/og.png" } });
    });

    it("returns 404 when shop not found", async () => {
      serviceMocks.refetchAdminShopImage.mockResolvedValue({ ok: false, reason: "not_found" });

      const res = await app.request("/shops/99/refetch-image", { method: "POST" });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /shops/:id (logoBackgroundColor validation)", () => {
    it("rejects invalid hex string on shop update", async () => {
      const res = await app.request("/shops/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoBackgroundColor: "red" }),
      });
      expect(res.status).toBe(400);
      expect(serviceMocks.updateManagedAdminShop).not.toHaveBeenCalled();
    });

    it("accepts null logoBackgroundColor on shop update", async () => {
      serviceMocks.updateManagedAdminShop.mockResolvedValue({
        ok: true,
        shop: { id: 1, name: "Shop" },
      });

      const res = await app.request("/shops/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoBackgroundColor: null }),
      });
      expect(res.status).toBe(200);
    });

    it("accepts a valid 6-digit hex on shop update", async () => {
      serviceMocks.updateManagedAdminShop.mockResolvedValue({
        ok: true,
        shop: { id: 1, name: "Shop" },
      });

      const res = await app.request("/shops/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoBackgroundColor: "#ABCDEF" }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /shops/:id/accept-review", () => {
    it("accepts review and returns shop", async () => {
      serviceMocks.acceptShopReview.mockResolvedValue({
        ok: true,
        shop: { id: 1, name: "Updated" },
      });

      const res = await app.request("/shops/1/accept-review", { method: "POST" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 1, name: "Updated" } });
    });

    it("returns 400 when no review data", async () => {
      serviceMocks.acceptShopReview.mockResolvedValue({ ok: false, reason: "no_review_data" });

      const res = await app.request("/shops/1/accept-review", { method: "POST" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when shop not found", async () => {
      serviceMocks.acceptShopReview.mockResolvedValue({ ok: false, reason: "not_found" });

      const res = await app.request("/shops/99/accept-review", { method: "POST" });

      expect(res.status).toBe(404);
    });
  });
});
