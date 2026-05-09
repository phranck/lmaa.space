import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  categoryExists: vi.fn(),
  clearAdminCategoryImage: vi.fn(),
  createAdminCategory: vi.fn(),
  getCategoryUnsplashImageId: vi.fn(),
  setAdminCategoryImage: vi.fn(),
  setAdminCategoryUnsplashImage: vi.fn(),
}));

const imageUploadMocks = vi.hoisted(() => ({
  processImageUpload: vi.fn(),
}));

const dispatchMocks = vi.hoisted(() => ({
  dispatchTemplateAssignments: vi.fn(),
}));

vi.mock("../repositories/admin-categories.js", () => repoMocks);
vi.mock("../lib/image-upload.js", () => imageUploadMocks);
vi.mock("../lib/result.js", async (importOriginal) => importOriginal());
vi.mock("./unsplash.js", () => ({ fetchUnsplashPhotoDetail: vi.fn() }));
vi.mock("../repositories/unsplash-images.js", () => ({
  updateUnsplashImageLocation: vi.fn(),
  upsertUnsplashImage: vi.fn(),
}));
vi.mock("../services/dispatch-template-assignments.js", () => dispatchMocks);

import {
  createCategoryWithPosts,
  removeManagedAdminCategoryImage,
  uploadManagedAdminCategoryImage,
} from "../services/admin-categories.js";

describe("uploadManagedAdminCategoryImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when category does not exist", async () => {
    repoMocks.categoryExists.mockResolvedValue(false);

    const result = await uploadManagedAdminCategoryImage(99, {});

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns image processing failure", async () => {
    repoMocks.categoryExists.mockResolvedValue(true);
    imageUploadMocks.processImageUpload.mockResolvedValue({ ok: false, reason: "too_large" });

    const result = await uploadManagedAdminCategoryImage(1, {});

    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("uploads image and returns category", async () => {
    repoMocks.categoryExists.mockResolvedValue(true);
    imageUploadMocks.processImageUpload.mockResolvedValue({
      ok: true,
      dataUrl: "data:image/webp;base64,abc",
    });
    repoMocks.setAdminCategoryImage.mockResolvedValue({ id: 1, name: "Mode", imageUrl: "data:..." });

    const result = await uploadManagedAdminCategoryImage(1, {});

    expect(result).toEqual({
      ok: true,
      category: { id: 1, name: "Mode", imageUrl: "data:..." },
    });
  });

  it("returns not_found when setAdminCategoryImage returns null", async () => {
    repoMocks.categoryExists.mockResolvedValue(true);
    imageUploadMocks.processImageUpload.mockResolvedValue({
      ok: true,
      dataUrl: "data:image/webp;base64,abc",
    });
    repoMocks.setAdminCategoryImage.mockResolvedValue(null);

    const result = await uploadManagedAdminCategoryImage(1, {});

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("removeManagedAdminCategoryImage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not_found when category does not exist", async () => {
    repoMocks.categoryExists.mockResolvedValue(false);

    const result = await removeManagedAdminCategoryImage(99);

    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("clears image and returns category", async () => {
    repoMocks.categoryExists.mockResolvedValue(true);
    repoMocks.clearAdminCategoryImage.mockResolvedValue({ id: 1, name: "Mode", imageUrl: null });

    const result = await removeManagedAdminCategoryImage(1);

    expect(result).toEqual({
      ok: true,
      category: { id: 1, name: "Mode", imageUrl: null },
    });
  });
});

describe("createCategoryWithPosts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the category and skips dispatch when no assignments are supplied", async () => {
    repoMocks.createAdminCategory.mockResolvedValue({ id: 7, name: "C", slug: "c" });

    const result = await createCategoryWithPosts({ name: "C", slug: "c", adminId: 1 });

    expect(result).toEqual({ id: 7, name: "C", slug: "c" });
    expect(repoMocks.createAdminCategory).toHaveBeenCalledWith({ name: "C", slug: "c" });
    expect(dispatchMocks.dispatchTemplateAssignments).not.toHaveBeenCalled();
  });

  it("creates the category and skips dispatch when assignments is an empty array", async () => {
    repoMocks.createAdminCategory.mockResolvedValue({ id: 7, name: "C", slug: "c" });

    await createCategoryWithPosts({ name: "C", slug: "c", adminId: 1, templateAssignments: [] });

    expect(dispatchMocks.dispatchTemplateAssignments).not.toHaveBeenCalled();
  });

  it("dispatches assignments with category context after create", async () => {
    const category = { id: 7, name: "C", slug: "c" };
    repoMocks.createAdminCategory.mockResolvedValue(category);

    await createCategoryWithPosts({
      name: "C",
      slug: "c",
      adminId: 1,
      templateAssignments: [{ accountId: 5, templateId: 9 }],
    });

    expect(dispatchMocks.dispatchTemplateAssignments).toHaveBeenCalledWith(
      1,
      "category",
      [{ accountId: 5, templateId: 9 }],
      expect.objectContaining({ kind: "category", category }),
    );
  });

  it("forwards optional category fields to the repository", async () => {
    repoMocks.createAdminCategory.mockResolvedValue({ id: 8, name: "B", slug: "b" });

    await createCategoryWithPosts({
      name: "B",
      slug: "b",
      adminId: 2,
      icon: "x",
      description: "desc",
      sortOrder: 5,
      imageUrl: "https://img.example/i.png",
      imagePhotographer: "P",
      imagePhotographerUrl: "https://p.example",
    });

    expect(repoMocks.createAdminCategory).toHaveBeenCalledWith({
      name: "B",
      slug: "b",
      icon: "x",
      description: "desc",
      sortOrder: 5,
      imageUrl: "https://img.example/i.png",
      imagePhotographer: "P",
      imagePhotographerUrl: "https://p.example",
    });
    expect(dispatchMocks.dispatchTemplateAssignments).not.toHaveBeenCalled();
  });
});
