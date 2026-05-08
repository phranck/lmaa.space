import { beforeEach, describe, expect, it, vi } from "vitest";

const getSubmissionStatus = vi.fn();
const deleteSubmission = vi.fn();
const reviewSubmission = vi.fn();
const getSubmissionCategoryNames = vi.fn();
const hydrateShopOgImageInBackground = vi.fn();
const setAdminShopOgImage = vi.fn();
const sendMastodonApprovalPost = vi.fn();

async function loadServiceModule() {
  vi.resetModules();

  vi.doMock("../config/env.js", () => ({
    env: {
      NODE_ENV: "test",
      RESEND_API_KEY: "",
      EMAIL_FROM: "test@test.com",
      LOG_LEVEL: "silent",
    },
  }));

  vi.doMock("../lib/logger.js", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));

  vi.doMock("../repositories/admin-submissions.js", () => ({
    deleteSubmission,
    getSubmissionCategoryNames,
    getSubmissionStatus,
    reviewSubmission,
  }));

  vi.doMock("../services/preview-images.js", () => ({
    hydrateShopOgImageInBackground,
  }));

  vi.doMock("../repositories/admin-shops.js", () => ({
    setAdminShopOgImage,
  }));

  vi.doMock("../services/mastodon.js", () => ({
    sendMastodonApprovalPost,
  }));

  return import("../services/admin-submissions.js");
}

describe("admin-submissions service", () => {
  beforeEach(() => {
    getSubmissionStatus.mockReset();
    deleteSubmission.mockReset();
    reviewSubmission.mockReset();
    getSubmissionCategoryNames.mockReset();
    hydrateShopOgImageInBackground.mockReset();
    setAdminShopOgImage.mockReset();
    sendMastodonApprovalPost.mockReset();
  });

  it("allows deleting onhold submissions", async () => {
    getSubmissionStatus.mockResolvedValue("onhold");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteAdminSubmission(42)).resolves.toEqual({ ok: true });

    expect(getSubmissionStatus).toHaveBeenCalledWith(42);
    expect(deleteSubmission).toHaveBeenCalledWith(42);
  });

  it("allows deleting rejected submissions", async () => {
    getSubmissionStatus.mockResolvedValue("rejected");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteAdminSubmission(7)).resolves.toEqual({ ok: true });

    expect(deleteSubmission).toHaveBeenCalledWith(7);
  });

  it("allows deleting pending submissions", async () => {
    getSubmissionStatus.mockResolvedValue("pending");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteAdminSubmission(9)).resolves.toEqual({ ok: true });

    expect(deleteSubmission).toHaveBeenCalledWith(9);
  });

  it("returns not_found when submission does not exist", async () => {
    getSubmissionStatus.mockResolvedValue(null);
    const service = await loadServiceModule();

    await expect(service.deleteAdminSubmission(404)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });

    expect(deleteSubmission).not.toHaveBeenCalled();
  });

  it("returns shop_exists when approve conflicts with an existing public shop", async () => {
    reviewSubmission.mockResolvedValue({
      submission: null,
      newShop: null,
      conflict: { existingShopId: 11, existingShopName: "Good Karma Coffee" },
    });
    const service = await loadServiceModule();

    await expect(
      service.reviewAdminSubmission({
        id: 442,
        status: "approved",
        adminId: 1,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "shop_exists",
      existingShopName: "Good Karma Coffee",
    });

    expect(hydrateShopOgImageInBackground).not.toHaveBeenCalled();
  });

  it("skips OG hydration when an approved submission already has an og image", async () => {
    reviewSubmission.mockResolvedValue({
      submission: {
        id: 5,
        ogImage: "https://cdn.example.com/preview.png",
      },
      newShop: {
        id: 17,
        url: "https://example.com",
      },
    });
    const service = await loadServiceModule();

    await expect(
      service.reviewAdminSubmission({
        id: 5,
        status: "approved",
        adminId: 1,
      }),
    ).resolves.toEqual({
      ok: true,
      submission: {
        id: 5,
        ogImage: "https://cdn.example.com/preview.png",
      },
    });

    expect(hydrateShopOgImageInBackground).not.toHaveBeenCalled();
    expect(setAdminShopOgImage).not.toHaveBeenCalled();
  });

  it("sends a Mastodon approval post when a template is selected", async () => {
    const submission = {
      id: 5,
      shopName: "Good Karma",
      shopUrl: "https://goodkarma.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: {
        id: 17,
        url: "https://goodkarma.example",
      },
      conflict: null,
    });
    getSubmissionCategoryNames.mockResolvedValue(["Coffee", "Food"]);
    const service = await loadServiceModule();

    await expect(
      service.reviewAdminSubmission({
        id: 5,
        status: "approved",
        adminId: 1,
        adminNote: "Looks good",
        templateId: 12,
      }),
    ).resolves.toEqual({
      ok: true,
      submission,
    });

    expect(getSubmissionCategoryNames).toHaveBeenCalledWith(5);
    expect(sendMastodonApprovalPost).toHaveBeenCalledWith(12, {
      submission,
      newShopId: 17,
      adminNote: "Looks good",
      categoryNames: ["Coffee", "Food"],
    });
  });
});
