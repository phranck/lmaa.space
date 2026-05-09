import { beforeEach, describe, expect, it, vi } from "vitest";

const upsertChoice = vi.fn();
const getAccountById = vi.fn();
const getSocialMediaPostTemplateById = vi.fn();
const postToMastodonAccount = vi.fn();
const postToBlueskyAccount = vi.fn();
const recordBackgroundError = vi.fn();

async function loadModule() {
  vi.resetModules();
  vi.doMock("../repositories/admin-user-account-template-choice.js", () => ({ upsertChoice }));
  vi.doMock("../repositories/social-media-accounts.js", () => ({ getAccountById }));
  vi.doMock("../repositories/social-media-post-templates.js", () => ({
    getSocialMediaPostTemplateById,
  }));
  vi.doMock("../services/mastodon.js", () => ({ postToMastodonAccount }));
  vi.doMock("../services/bluesky.js", () => ({ postToBlueskyAccount }));
  vi.doMock("../services/background-errors.js", () => ({ recordBackgroundError }));
  vi.doMock("../lib/logger.js", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));
  return import("../services/dispatch-template-assignments.js");
}

const categoryContext = {
  kind: "category" as const,
  category: {
    id: 7,
    name: "Cat",
    slug: "cat",
    description: null,
    imageUrl: null,
  } as never,
};

beforeEach(() => {
  upsertChoice.mockReset();
  upsertChoice.mockResolvedValue(undefined);
  getAccountById.mockReset();
  getSocialMediaPostTemplateById.mockReset();
  postToMastodonAccount.mockReset();
  postToBlueskyAccount.mockReset();
  recordBackgroundError.mockReset();
  recordBackgroundError.mockResolvedValue(undefined);
});

describe("dispatchTemplateAssignments", () => {
  it("upserts sticky choice and skips post when templateId is null", async () => {
    const { dispatchTemplateAssignments } = await loadModule();

    await dispatchTemplateAssignments(
      1,
      "category",
      [{ accountId: 5, templateId: null }],
      categoryContext,
    );

    expect(upsertChoice).toHaveBeenCalledWith(1, 5, null, "category");
    expect(postToMastodonAccount).not.toHaveBeenCalled();
    expect(postToBlueskyAccount).not.toHaveBeenCalled();
  });

  it("records error when template scope does not include dispatch scope", async () => {
    getAccountById.mockResolvedValue({ id: 5, isActive: true, platform: "mastodon" });
    getSocialMediaPostTemplateById.mockResolvedValue({
      id: 9,
      scopes: ["submission"],
      platforms: ["mastodon"],
    });

    const { dispatchTemplateAssignments } = await loadModule();

    await dispatchTemplateAssignments(
      1,
      "category",
      [{ accountId: 5, templateId: 9 }],
      categoryContext,
    );

    expect(recordBackgroundError).toHaveBeenCalledWith(
      "mastodon-post",
      expect.any(Error),
      expect.objectContaining({ accountId: 5, templateId: 9, scope: "category" }),
    );
    expect(postToMastodonAccount).not.toHaveBeenCalled();
  });

  it("dispatches mastodon post when scope and platform match", async () => {
    getAccountById.mockResolvedValue({ id: 5, isActive: true, platform: "mastodon" });
    getSocialMediaPostTemplateById.mockResolvedValue({
      id: 9,
      scopes: ["category"],
      platforms: ["mastodon"],
    });

    const { dispatchTemplateAssignments } = await loadModule();

    await dispatchTemplateAssignments(
      1,
      "category",
      [{ accountId: 5, templateId: 9 }],
      categoryContext,
    );

    expect(postToMastodonAccount).toHaveBeenCalledTimes(1);
    expect(postToBlueskyAccount).not.toHaveBeenCalled();
  });

  it("dispatches bluesky post when scope and platform match", async () => {
    getAccountById.mockResolvedValue({ id: 5, isActive: true, platform: "bluesky" });
    getSocialMediaPostTemplateById.mockResolvedValue({
      id: 9,
      scopes: ["category"],
      platforms: ["bluesky"],
    });

    const { dispatchTemplateAssignments } = await loadModule();

    await dispatchTemplateAssignments(
      1,
      "category",
      [{ accountId: 5, templateId: 9 }],
      categoryContext,
    );

    expect(postToBlueskyAccount).toHaveBeenCalledTimes(1);
    expect(postToMastodonAccount).not.toHaveBeenCalled();
  });
});
