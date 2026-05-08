import { beforeEach, describe, expect, it, vi } from "vitest";

const getSubmissionStatus = vi.fn();
const deleteSubmission = vi.fn();
const reviewSubmission = vi.fn();
const getSubmissionCategoryNames = vi.fn();
const hydrateShopOgImageInBackground = vi.fn();
const setAdminShopOgImage = vi.fn();
const postToMastodonAccount = vi.fn();
const postToBlueskyAccount = vi.fn();
const upsertChoice = vi.fn();
const getAccountById = vi.fn();
const getSocialMediaPostTemplateById = vi.fn();
const recordBackgroundError = vi.fn();

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
    postToMastodonAccount,
    buildApprovalPostVariables: vi.fn(),
  }));

  vi.doMock("../services/bluesky.js", () => ({
    postToBlueskyAccount,
  }));

  vi.doMock("../repositories/admin-user-account-template-choice.js", () => ({
    upsertChoice,
  }));

  vi.doMock("../repositories/social-media-accounts.js", () => ({
    getAccountById,
  }));

  vi.doMock("../repositories/social-media-post-templates.js", () => ({
    getSocialMediaPostTemplateById,
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
    postToMastodonAccount.mockReset();
    postToBlueskyAccount.mockReset();
    upsertChoice.mockReset();
    upsertChoice.mockResolvedValue(undefined);
    getAccountById.mockReset();
    getSocialMediaPostTemplateById.mockReset();
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

  it("dispatches templateAssignments to the matching active account", async () => {
    const submission = {
      id: 5,
      shopName: "Good Karma",
      shopUrl: "https://goodkarma.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    const mastodonAccount = {
      id: 50,
      platform: "mastodon",
      isActive: true,
      maxPostCharacters: 500,
      handle: null,
      visibility: "public",
      instanceUrl: "https://example.social",
      accessToken: "tok",
      label: "primary",
      username: "u",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const template = {
      id: 12,
      name: "approval",
      platforms: ["mastodon"],
      bodyMastodon: "{{shopName}}",
      bodyBluesky: null,
      isSystemTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: { id: 17, url: "https://goodkarma.example" },
      conflict: null,
    });
    getSubmissionCategoryNames.mockResolvedValue(["Coffee", "Food"]);
    getAccountById.mockResolvedValue(mastodonAccount);
    getSocialMediaPostTemplateById.mockResolvedValue(template);
    postToMastodonAccount.mockResolvedValue(undefined);
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
    expect(upsertChoice).toHaveBeenCalledWith(1, 50, 12);
    expect(postToMastodonAccount).toHaveBeenCalledTimes(1);
    expect(postToBlueskyAccount).not.toHaveBeenCalled();
  });

  it("templateAssignments with templateId=null upserts the choice but skips posting", async () => {
    const submission = {
      id: 6,
      shopName: "Other",
      shopUrl: "https://other.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: { id: 18, url: "https://other.example" },
      conflict: null,
    });
    getSubmissionCategoryNames.mockResolvedValue([]);
    const service = await loadServiceModule();

    await expect(
      service.reviewAdminSubmission({
        id: 6,
        status: "approved",
        adminId: 2,
        templateAssignments: [{ accountId: 60, templateId: null }],
      }),
    ).resolves.toEqual({ ok: true, submission });

    await flushPromises();

    expect(upsertChoice).toHaveBeenCalledWith(2, 60, null);
    expect(getAccountById).not.toHaveBeenCalled();
    expect(postToMastodonAccount).not.toHaveBeenCalled();
    expect(postToBlueskyAccount).not.toHaveBeenCalled();
  });

  it("logs background error when template does not cover account platform", async () => {
    const submission = {
      id: 7,
      shopName: "X",
      shopUrl: "https://x.example",
      ogImage: "https://cdn.example.com/preview.png",
    };
    const blueskyAccount = {
      id: 70,
      platform: "bluesky",
      isActive: true,
      maxPostCharacters: 300,
      handle: "x.bsky.social",
      visibility: null,
      instanceUrl: "",
      accessToken: "abcd-efgh-ijkl-mnop",
      label: "bsky",
      username: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mastodonOnly = {
      id: 13,
      name: "mast-only",
      platforms: ["mastodon"],
      bodyMastodon: "x",
      bodyBluesky: null,
      isSystemTemplate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    reviewSubmission.mockResolvedValue({
      submission,
      newShop: { id: 19, url: "https://x.example" },
      conflict: null,
    });
    getSubmissionCategoryNames.mockResolvedValue([]);
    getAccountById.mockResolvedValue(blueskyAccount);
    getSocialMediaPostTemplateById.mockResolvedValue(mastodonOnly);
    const service = await loadServiceModule();

    await service.reviewAdminSubmission({
      id: 7,
      status: "approved",
      adminId: 3,
      templateAssignments: [{ accountId: 70, templateId: 13 }],
    });

    await flushPromises();

    expect(postToMastodonAccount).not.toHaveBeenCalled();
    expect(postToBlueskyAccount).not.toHaveBeenCalled();
    expect(recordBackgroundError).toHaveBeenCalledWith(
      "bluesky-post",
      expect.any(Error),
      expect.objectContaining({ accountId: 70, templateId: 13 }),
    );
  });
});
