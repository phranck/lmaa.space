import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  createAdminShop: vi.fn(),
  getAdminShopById: vi.fn(),
  getAdminShopUrl: vi.fn(),
  markAdminShopDeleted: vi.fn(),
  permanentlyDeleteAdminShop: vi.fn(),
  setAdminShopOgImage: vi.fn(),
  setAdminShopVisibility: vi.fn(),
  updateAdminShop: vi.fn(),
  updateAdminShopDeleteReason: vi.fn(),
}));

const previewMocks = vi.hoisted(() => ({
  fetchShopPreviewImageFromHomepage: vi.fn(),
  hydrateShopOgImageInBackground: vi.fn(),
}));

const publicServiceMocks = vi.hoisted(() => ({
  validateShopUrl: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  SHOPS_CACHE_KEY: "shops:all",
  invalidateCache: vi.fn(),
}));

const dbMock = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

const schemaMock = vi.hoisted(() => ({
  categories: { id: "categories.id", name: "categories.name" },
}));

const mapperMock = vi.hoisted(() => ({
  mapShopJsonToShopData: vi.fn(),
}));

vi.mock("../repositories/admin-shops.js", () => repoMocks);
vi.mock("../services/preview-images.js", () => previewMocks);
vi.mock("../services/public.js", () => publicServiceMocks);
vi.mock("../middleware/cache.js", () => cacheMocks);
vi.mock("../db/index.js", () => dbMock);
vi.mock("../db/schema.js", () => schemaMock);
vi.mock("../lib/shopjson-mapper.js", () => mapperMock);
vi.mock("../lib/result.js", async (importOriginal) => importOriginal());

import {
  acceptShopReview,
  changeManagedAdminShopVisibility,
  createManagedAdminShop,
  deleteManagedAdminShop,
  previewAdminShopImage,
  refetchAdminShopImage,
  setManagedAdminShopOgImage,
  stageShopReviewData,
  updateManagedAdminShop,
  updateManagedAdminShopDeleteReason,
} from "../services/admin-shops.js";

describe("createManagedAdminShop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicServiceMocks.validateShopUrl.mockResolvedValue({ status: "available" });
  });

  it("creates a shop, invalidates cache, and triggers OG hydration", async () => {
    repoMocks.createAdminShop.mockResolvedValue({ id: 1, url: "https://shop.de", name: "Shop" });

    const result = await createManagedAdminShop({ name: "Shop", url: "https://shop.de" } as never);

    expect(result).toEqual({
      ok: true,
      shop: { id: 1, url: "https://shop.de", name: "Shop", categories: [] },
    });
    expect(publicServiceMocks.validateShopUrl).toHaveBeenCalledWith("https://shop.de");
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
    expect(previewMocks.hydrateShopOgImageInBackground).toHaveBeenCalledWith(
      "https://shop.de",
      expect.any(Function),
    );
  });

  it("persists the OG image via the hydration callback", async () => {
    repoMocks.createAdminShop.mockResolvedValue({ id: 42, url: "https://shop.de" });

    await createManagedAdminShop({ name: "Shop", url: "https://shop.de" } as never);

    const callback = previewMocks.hydrateShopOgImageInBackground.mock.calls[0][1];
    await callback("https://cdn.example.com/og.png");

    expect(repoMocks.setAdminShopOgImage).toHaveBeenCalledWith(42, "https://cdn.example.com/og.png");
  });

  it("blocks creation when a pending submission for the same domain exists", async () => {
    publicServiceMocks.validateShopUrl.mockResolvedValue({
      status: "pending",
      shopName: "Good Karma Coffee",
    });

    const result = await createManagedAdminShop({
      name: "Shop",
      url: "https://www.goodkarmacoffee.de",
    } as never);

    expect(result).toEqual({
      ok: false,
      reason: "domain_conflict",
      conflictStatus: "pending",
      conflictShopName: "Good Karma Coffee",
    });
    expect(repoMocks.createAdminShop).not.toHaveBeenCalled();
    expect(cacheMocks.invalidateCache).not.toHaveBeenCalled();
  });

  it("blocks creation when the domain belongs to a published shop", async () => {
    publicServiceMocks.validateShopUrl.mockResolvedValue({
      status: "published",
      shopName: "Existing Shop",
    });

    const result = await createManagedAdminShop({
      name: "Duplicate",
      url: "https://existing.de",
    } as never);

    expect(result).toEqual({
      ok: false,
      reason: "domain_conflict",
      conflictStatus: "published",
      conflictShopName: "Existing Shop",
    });
    expect(repoMocks.createAdminShop).not.toHaveBeenCalled();
  });
});

describe("updateManagedAdminShop", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns failure when shop not found", async () => {
    repoMocks.updateAdminShop.mockResolvedValue(null);

    const result = await updateManagedAdminShop(99, {} as never);

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(cacheMocks.invalidateCache).not.toHaveBeenCalled();
  });

  it("returns updated shop and invalidates cache", async () => {
    repoMocks.updateAdminShop.mockResolvedValue({ id: 1, name: "Updated" });

    const result = await updateManagedAdminShop(1, { name: "Updated" } as never);

    expect(result).toEqual({
      ok: true,
      shop: { id: 1, name: "Updated", categories: [] },
    });
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });
});

describe("deleteManagedAdminShop", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permanently deletes when mode is delete", async () => {
    repoMocks.permanentlyDeleteAdminShop.mockResolvedValue(true);

    const result = await deleteManagedAdminShop(1, {
      mode: "delete",
      reason: null,
      wasReported: false,
      adminId: null,
    });

    expect(result).toEqual({ ok: true, message: "Shop permanently deleted" });
    expect(repoMocks.permanentlyDeleteAdminShop).toHaveBeenCalledWith(1);
    expect(repoMocks.markAdminShopDeleted).not.toHaveBeenCalled();
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });

  it("marks as deleted when mode is mark_deleted", async () => {
    repoMocks.markAdminShopDeleted.mockResolvedValue(true);

    const result = await deleteManagedAdminShop(1, {
      mode: "mark_deleted",
      reason: "Spam",
      wasReported: true,
      adminId: 5,
    });

    expect(result).toEqual({ ok: true, message: "Shop marked deleted" });
    expect(repoMocks.markAdminShopDeleted).toHaveBeenCalledWith(1, 5, "Spam", true);
  });

  it("returns failure when shop not found", async () => {
    repoMocks.permanentlyDeleteAdminShop.mockResolvedValue(false);

    const result = await deleteManagedAdminShop(99, {
      mode: "delete",
      reason: null,
      wasReported: false,
      adminId: null,
    });

    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(cacheMocks.invalidateCache).not.toHaveBeenCalled();
  });
});

describe("changeManagedAdminShopVisibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets visibility and invalidates cache", async () => {
    repoMocks.setAdminShopVisibility.mockResolvedValue(true);

    const result = await changeManagedAdminShopVisibility(1, "public");

    expect(result).toEqual({ ok: true, message: "Shop visibility set to public" });
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });

  it("passes rejection options through", async () => {
    repoMocks.setAdminShopVisibility.mockResolvedValue(true);

    await changeManagedAdminShopVisibility(1, "rejected", {
      rejectionToken: "abc",
      rejectionAdminNote: "Spam",
      rejectionLongText: null,
    });

    expect(repoMocks.setAdminShopVisibility).toHaveBeenCalledWith(1, "rejected", {
      rejectionToken: "abc",
      rejectionAdminNote: "Spam",
      rejectionLongText: null,
    });
  });

  it("returns failure when shop not found", async () => {
    repoMocks.setAdminShopVisibility.mockResolvedValue(false);

    const result = await changeManagedAdminShopVisibility(99, "public");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("refetchAdminShopImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when shop has no URL", async () => {
    repoMocks.getAdminShopUrl.mockResolvedValue(null);

    const result = await refetchAdminShopImage(99);

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("fetches preview, persists, and returns the URL", async () => {
    repoMocks.getAdminShopUrl.mockResolvedValue("https://shop.de");
    previewMocks.fetchShopPreviewImageFromHomepage.mockResolvedValue({
      url: "https://cdn.example.com/og.png",
    });

    const result = await refetchAdminShopImage(1);

    expect(result).toEqual({ ok: true, ogImage: "https://cdn.example.com/og.png" });
    expect(repoMocks.setAdminShopOgImage).toHaveBeenCalledWith(1, "https://cdn.example.com/og.png");
  });

  it("persists null when no preview found", async () => {
    repoMocks.getAdminShopUrl.mockResolvedValue("https://shop.de");
    previewMocks.fetchShopPreviewImageFromHomepage.mockResolvedValue(null);

    const result = await refetchAdminShopImage(1);

    expect(result).toEqual({ ok: true, ogImage: null });
    expect(repoMocks.setAdminShopOgImage).toHaveBeenCalledWith(1, null);
  });
});

describe("setManagedAdminShopOgImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets the image and invalidates cache", async () => {
    const result = await setManagedAdminShopOgImage(1, "https://cdn.example.com/og.png");

    expect(result).toEqual({ ok: true });
    expect(repoMocks.setAdminShopOgImage).toHaveBeenCalledWith(1, "https://cdn.example.com/og.png");
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });
});

describe("previewAdminShopImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the preview URL", async () => {
    previewMocks.fetchShopPreviewImageFromHomepage.mockResolvedValue({ url: "https://img.png" });

    const result = await previewAdminShopImage("https://shop.de");

    expect(result).toEqual({ ogImage: "https://img.png" });
  });

  it("returns null when no preview found", async () => {
    previewMocks.fetchShopPreviewImageFromHomepage.mockResolvedValue(null);

    const result = await previewAdminShopImage("https://shop.de");

    expect(result).toEqual({ ogImage: null });
  });
});

describe("updateManagedAdminShopDeleteReason", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates reason and invalidates cache", async () => {
    repoMocks.updateAdminShopDeleteReason.mockResolvedValue(true);

    const result = await updateManagedAdminShopDeleteReason(1, "New reason");

    expect(result).toEqual({ ok: true });
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });

  it("returns failure when shop not found", async () => {
    repoMocks.updateAdminShopDeleteReason.mockResolvedValue(false);

    const result = await updateManagedAdminShopDeleteReason(99, "Reason");

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("stageShopReviewData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stages review data and invalidates cache", async () => {
    repoMocks.updateAdminShop.mockResolvedValue({ id: 1, name: "Shop" });

    const result = await stageShopReviewData(1, { name: "Updated" });

    expect(result).toEqual({ ok: true, shop: { id: 1, name: "Shop" } });
    expect(repoMocks.updateAdminShop).toHaveBeenCalledWith(1, {
      reviewData: { name: "Updated" },
      needsReview: true,
    });
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });

  it("returns failure when shop not found", async () => {
    repoMocks.updateAdminShop.mockResolvedValue(null);

    const result = await stageShopReviewData(99, {});

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("acceptShopReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when shop missing", async () => {
    repoMocks.getAdminShopById.mockResolvedValue(null);

    const result = await acceptShopReview(99);

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns no_review_data when reviewData is null", async () => {
    repoMocks.getAdminShopById.mockResolvedValue({ id: 1, reviewData: null });

    const result = await acceptShopReview(1);

    expect(result).toEqual({ ok: false, reason: "no_review_data" });
  });

  it("applies review data and clears staging", async () => {
    repoMocks.getAdminShopById.mockResolvedValue({ id: 1, reviewData: { name: "New Name" } });

    const fromChain = vi.fn().mockReturnValue([{ id: 10, name: "Mode" }]);
    const selectChain = vi.fn().mockReturnValue({ from: fromChain });
    dbMock.db.select = selectChain;

    mapperMock.mapShopJsonToShopData.mockReturnValue({
      name: "New Name",
      url: "https://new.de",
      categoryIds: [10],
    });

    repoMocks.updateAdminShop.mockResolvedValue({ id: 1, name: "New Name" });

    const result = await acceptShopReview(1);

    expect(result).toEqual({
      ok: true,
      shop: { id: 1, name: "New Name", categories: [] },
    });
    expect(repoMocks.updateAdminShop).toHaveBeenCalledWith(1, {
      name: "New Name",
      url: "https://new.de",
      categoryIds: [10],
      needsReview: false,
      reviewData: null,
    });
    expect(cacheMocks.invalidateCache).toHaveBeenCalledWith("shops:all");
  });
});
