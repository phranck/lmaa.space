import { beforeEach, describe, expect, it, vi } from "vitest";

const getSubmissionStatus = vi.fn();
const deleteSubmission = vi.fn();
const reviewSubmission = vi.fn();
const getSubmissionCategoryNames = vi.fn();
const hydrateShopOgImageInBackground = vi.fn();
const setAdminShopOgImage = vi.fn();
const dispatchTemplateAssignments = vi.fn();
const recordBackgroundError = vi.fn();

async function loadServiceModule() {
  vi.resetModules();

  vi.doMock("../config/env.js", () => ({
    env: {
      NODE_ENV: "test",
      SMTP2GO_API_KEY: "",
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

  vi.doMock("../services/dispatch-template-assignments.js", () => ({
    dispatchTemplateAssignments,
  }));

  vi.doMock("../services/background-errors.js", () => ({
    recordBackgroundError,
  }));

  return import("../services/admin-submissions.js");
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("admin-submissions service", () => {
  beforeEach(() => {
    getSubmissionStatus.mockReset();
    deleteSubmission.mockReset();
    reviewSubmission.mockReset();
    getSubmissionCategoryNames.mockReset();
    hydrateShopOgImageInBackground.mockReset();
    setAdminShopOgImage.mockReset();
    dispatchTemplateAssignments.mockReset();
    recordBackgroundError.mockReset();
    recordBackgroundError.mockResolvedValue(undefined);
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

  it("passes logoBackgroundColor through when approving a submission with a color set", async () => {
    reviewSubmission.mockResolvedValue({
      submission: {
        id: 7,
        shopName: "Colorful Shop",
        shopUrl: "https://colorful.example",
        ogImage: "https://cdn.example.com/preview.png",
        logoBackgroundColor: "#ff00aa",
      },
      newShop: {
        id: 20,
        url: "https://colorful.example",
      },
      conflict: null,
    });
    const service = await loadServiceModule();

    const result = await service.reviewAdminSubmission({
      id: 7,
      status: "approved",
      adminId: 1,
    });

    expect(result).toEqual({
      ok: true,
      submission: expect.objectContaining({ logoBackgroundColor: "#ff00aa" }),
    });
  });

  it("passes null logoBackgroundColor through when approving a submission without a color", async () => {
    reviewSubmission.mockResolvedValue({
      submission: {
        id: 8,
        shopName: "Plain Shop",
        shopUrl: "https://plain.example",
        ogImage: "https://cdn.example.com/preview.png",
        logoBackgroundColor: null,
      },
      newShop: {
        id: 21,
        url: "https://plain.example",
      },
      conflict: null,
    });
    const service = await loadServiceModule();

    const result = await service.reviewAdminSubmission({
      id: 8,
      status: "approved",
      adminId: 1,
    });

    expect(result).toEqual({
      ok: true,
      submission: expect.objectContaining({ logoBackgroundColor: null }),
    });
  });

  it("forwards templateAssignments to the dispatcher with submission context", async () => {
    const submission = {
      id: 5,
      shopName: "Good Karma",
      shopUrl: "https://goodkarma.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: { id: 17, url: "https://goodkarma.example" },
      conflict: null,
    });
    getSubmissionCategoryNames.mockResolvedValue(["Coffee", "Food"]);
    dispatchTemplateAssignments.mockResolvedValue(undefined);
    const service = await loadServiceModule();

    await expect(
      service.reviewAdminSubmission({
        id: 5,
        status: "approved",
        adminId: 1,
        adminNote: "Looks good",
        templateAssignments: [{ accountId: 50, templateId: 12 }],
      }),
    ).resolves.toEqual({ ok: true, submission });

    await flushPromises();

    expect(getSubmissionCategoryNames).toHaveBeenCalledWith(5);
    expect(dispatchTemplateAssignments).toHaveBeenCalledTimes(1);
    expect(dispatchTemplateAssignments).toHaveBeenCalledWith(
      1,
      "submission",
      [{ accountId: 50, templateId: 12 }],
      expect.objectContaining({
        kind: "submission",
        submission,
        newShopId: 17,
        adminNote: "Looks good",
        categoryNames: ["Coffee", "Food"],
      }),
    );
  });

  it("does not dispatch when status is not approved", async () => {
    const submission = {
      id: 8,
      shopName: "X",
      shopUrl: "https://x.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: null,
      conflict: null,
    });
    const service = await loadServiceModule();

    await service.reviewAdminSubmission({
      id: 8,
      status: "rejected",
      adminId: 1,
      templateAssignments: [{ accountId: 50, templateId: 12 }],
    });

    await flushPromises();

    expect(dispatchTemplateAssignments).not.toHaveBeenCalled();
  });

  it("does not dispatch when templateAssignments is empty", async () => {
    const submission = {
      id: 9,
      shopName: "X",
      shopUrl: "https://x.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: { id: 19, url: "https://x.example" },
      conflict: null,
    });
    const service = await loadServiceModule();

    await service.reviewAdminSubmission({
      id: 9,
      status: "approved",
      adminId: 1,
      templateAssignments: [],
    });

    await flushPromises();

    expect(dispatchTemplateAssignments).not.toHaveBeenCalled();
    expect(getSubmissionCategoryNames).not.toHaveBeenCalled();
  });
});
