import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  categoryExists: vi.fn(),
  clearAdminCategoryImage: vi.fn(),
  setAdminCategoryImage: vi.fn(),
}));

const imageUploadMocks = vi.hoisted(() => ({
  processImageUpload: vi.fn(),
}));

vi.mock("../repositories/admin-categories.js", () => repoMocks);
vi.mock("../lib/image-upload.js", () => imageUploadMocks);
vi.mock("../lib/result.js", async (importOriginal) => importOriginal());

import {
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
