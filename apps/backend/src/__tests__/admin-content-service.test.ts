import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  contentPageSlugExists: vi.fn(),
  createContentPage: vi.fn(),
  deleteContentPage: vi.fn(),
  getAdminUsernameById: vi.fn(),
  getAdminUsernamesByIds: vi.fn(),
  getContentPageBySlug: vi.fn(),
  listContentPageSummaries: vi.fn(),
  updateContentPageBody: vi.fn(),
  updateContentPageMeta: vi.fn(),
}));

vi.mock("../repositories/admin-content.js", () => repoMocks);
vi.mock("../lib/result.js", async (importOriginal) => importOriginal());

import {
  createManagedContentPage,
  deleteManagedContentPage,
  getManagedContentPage,
  getManagedContentPages,
  updateManagedContentPageBody,
  updateManagedContentPageMeta,
} from "../services/admin-content.js";

describe("getManagedContentPages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns summaries with resolved usernames", async () => {
    repoMocks.listContentPageSummaries.mockResolvedValue([
      {
        slug: "about",
        title: "About",
        status: "published",
        showTitle: true,
        contentWidth: "wide",
        createdAt: new Date("2024-01-01"),
        createdBy: 1,
        updatedAt: new Date("2024-06-01"),
        updatedBy: 2,
      },
    ]);
    repoMocks.getAdminUsernamesByIds.mockResolvedValue(
      new Map([
        [1, "alice"],
        [2, "bob"],
      ]),
    );

    const result = await getManagedContentPages();

    expect(result).toEqual([
      {
        slug: "about",
        title: "About",
        status: "published",
        showTitle: true,
        contentWidth: "wide",
        createdAt: "2024-01-01T00:00:00.000Z",
        createdByUsername: "alice",
        updatedAt: "2024-06-01T00:00:00.000Z",
        updatedByUsername: "bob",
      },
    ]);
  });
});

describe("createManagedContentPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns slug_conflict when slug exists", async () => {
    repoMocks.contentPageSlugExists.mockResolvedValue(true);

    const result = await createManagedContentPage({
      slug: "about",
      title: "About",
      adminId: 1,
    });

    expect(result).toEqual({ ok: false, reason: "slug_conflict" });
  });

  it("creates page and returns summary", async () => {
    repoMocks.contentPageSlugExists.mockResolvedValue(false);
    repoMocks.createContentPage.mockResolvedValue({
      slug: "new-page",
      title: "New Page",
      status: "draft",
      showTitle: true,
      contentWidth: "default",
      createdAt: new Date("2024-01-01"),
    });
    repoMocks.getAdminUsernameById.mockResolvedValue("alice");

    const result = await createManagedContentPage({
      slug: "new-page",
      title: "New Page",
      adminId: 1,
    });

    expect(result).toEqual({
      ok: true,
      page: {
        slug: "new-page",
        title: "New Page",
        status: "draft",
        showTitle: true,
        contentWidth: "default",
        createdAt: "2024-01-01T00:00:00.000Z",
        createdByUsername: "alice",
        updatedAt: null,
        updatedByUsername: null,
      },
    });
  });
});

describe("getManagedContentPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when page not found", async () => {
    repoMocks.getContentPageBySlug.mockResolvedValue(null);

    const result = await getManagedContentPage("missing");

    expect(result).toBeNull();
  });

  it("returns full page with resolved usernames", async () => {
    repoMocks.getContentPageBySlug.mockResolvedValue({
      slug: "about",
      title: "About",
      content: "# About",
      status: "published",
      showTitle: true,
      contentWidth: "full",
      createdAt: new Date("2024-01-01"),
      createdBy: 1,
      updatedAt: null,
      updatedBy: null,
    });
    repoMocks.getAdminUsernamesByIds.mockResolvedValue(new Map([[1, "alice"]]));

    const result = await getManagedContentPage("about");

    expect(result).toEqual({
      slug: "about",
      title: "About",
      content: "# About",
      status: "published",
      showTitle: true,
      contentWidth: "full",
      createdAt: "2024-01-01T00:00:00.000Z",
      createdByUsername: "alice",
      updatedAt: null,
      updatedByUsername: null,
    });
  });
});

describe("updateManagedContentPageBody", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when page not found", async () => {
    repoMocks.updateContentPageBody.mockResolvedValue(null);

    const result = await updateManagedContentPageBody({
      slug: "missing",
      content: "new",
      adminId: 1,
    });

    expect(result).toBeNull();
  });

  it("updates body and returns metadata", async () => {
    repoMocks.updateContentPageBody.mockResolvedValue({
      slug: "about",
      updatedAt: new Date("2024-06-01"),
    });
    repoMocks.getAdminUsernameById.mockResolvedValue("bob");

    const result = await updateManagedContentPageBody({
      slug: "about",
      content: "# Updated",
      adminId: 2,
    });

    expect(result).toEqual({
      slug: "about",
      updatedAt: "2024-06-01T00:00:00.000Z",
      updatedByUsername: "bob",
    });
  });
});

describe("updateManagedContentPageMeta", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns slug_conflict when new slug exists", async () => {
    repoMocks.contentPageSlugExists.mockResolvedValue(true);

    const result = await updateManagedContentPageMeta({
      currentSlug: "about",
      newSlug: "existing",
      adminId: 1,
    });

    expect(result).toEqual({ ok: false, reason: "slug_conflict" });
  });

  it("returns not_found when page missing", async () => {
    repoMocks.contentPageSlugExists.mockResolvedValue(false);
    repoMocks.updateContentPageMeta.mockResolvedValue(null);

    const result = await updateManagedContentPageMeta({
      currentSlug: "missing",
      newSlug: "new-slug",
      adminId: 1,
    });

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("updates meta and returns result", async () => {
    repoMocks.updateContentPageMeta.mockResolvedValue({
      slug: "new-slug",
      title: "New Title",
      status: "published",
      showTitle: false,
      contentWidth: "wide",
      updatedAt: new Date("2024-06-01"),
    });

    const result = await updateManagedContentPageMeta({
      currentSlug: "about",
      title: "New Title",
      adminId: 1,
    });

    expect(result).toEqual({
      ok: true,
      page: {
        slug: "new-slug",
        title: "New Title",
        status: "published",
        showTitle: false,
        contentWidth: "wide",
        updatedAt: "2024-06-01T00:00:00.000Z",
      },
    });
  });
});

describe("deleteManagedContentPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("delegates to repository", async () => {
    repoMocks.deleteContentPage.mockResolvedValue(true);

    const result = await deleteManagedContentPage("about");

    expect(result).toBe(true);
    expect(repoMocks.deleteContentPage).toHaveBeenCalledWith("about");
  });
});
