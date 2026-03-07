import { beforeEach, describe, expect, it, vi } from "vitest";

const getSubmissionStatus = vi.fn();
const deleteSubmission = vi.fn();
const reviewSubmission = vi.fn();
const hydrateShopOgImageInBackground = vi.fn();
const setAdminShopOgImage = vi.fn();

async function loadServiceModule() {
  vi.resetModules();

  vi.doMock("../repositories/admin-submissions.js", () => ({
    deleteSubmission,
    getSubmissionStatus,
    reviewSubmission,
  }));

  vi.doMock("../services/preview-images.js", () => ({
    hydrateShopOgImageInBackground,
  }));

  vi.doMock("../repositories/admin-shops.js", () => ({
    setAdminShopOgImage,
  }));

  return import("../services/admin-submissions.js");
}

describe("admin-submissions service", () => {
  beforeEach(() => {
    getSubmissionStatus.mockReset();
    deleteSubmission.mockReset();
    reviewSubmission.mockReset();
    hydrateShopOgImageInBackground.mockReset();
    setAdminShopOgImage.mockReset();
  });

  it("allows deleting onhold submissions", async () => {
    getSubmissionStatus.mockResolvedValue("onhold");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(42)).resolves.toEqual({ ok: true });

    expect(getSubmissionStatus).toHaveBeenCalledWith(42);
    expect(deleteSubmission).toHaveBeenCalledWith(42);
  });

  it("allows deleting rejected submissions", async () => {
    getSubmissionStatus.mockResolvedValue("rejected");
    deleteSubmission.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(7)).resolves.toEqual({ ok: true });

    expect(deleteSubmission).toHaveBeenCalledWith(7);
  });

  it("rejects deleting non-moderated submissions", async () => {
    getSubmissionStatus.mockResolvedValue("pending");
    const service = await loadServiceModule();

    await expect(service.deleteModeratedAdminSubmission(9)).resolves.toEqual({
      ok: false,
      reason: "invalid_status",
    });

    expect(deleteSubmission).not.toHaveBeenCalled();
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
});
