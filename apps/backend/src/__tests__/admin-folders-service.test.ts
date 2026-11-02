import { describe, expect, it, vi } from "vitest";

const hasEmailTemplateMediaReferences = vi.hoisted(() => vi.fn());
const removeStoredMediaAsset = vi.hoisted(() => vi.fn());
const txDelete = vi.hoisted(() => vi.fn());
const txExecute = vi.hoisted(() => vi.fn());
const txSelect = vi.hoisted(() => vi.fn());
const dbSelect = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());

vi.mock("../db/client.js", () => ({
  db: {
    select: dbSelect,
    transaction,
  },
}));

vi.mock("../lib/media-storage.js", () => ({
  removeStoredMediaAsset,
}));

vi.mock("../services/admin-media.js", () => ({
  hasEmailTemplateMediaReferences,
  listManagedMediaAssetsByFolder: vi.fn(),
}));

import { deleteFolderCascade } from "../services/admin-folders.js";

describe("folder cascade deletion", () => {
  it("stops when a contained asset is referenced by an email template", async () => {
    const folderRow = {
      id: 1,
      name: "Email assets",
      parentId: null,
      color: null,
      systemKey: null,
      isSystem: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      createdBy: 1,
    };
    dbSelect.mockReturnValue({
      from: () => ({
        where: () => ({ limit: async () => [folderRow] }),
      }),
    });
    txExecute.mockResolvedValue([{ id: 1 }]);
    txSelect.mockReturnValue({
      from: () => ({
        where: async () => [{ id: 7, storedFilename: "existing-default-preview.jpg" }],
      }),
    });
    txDelete.mockReturnValue({ where: vi.fn() });
    transaction.mockImplementation(async (callback) =>
      callback({ execute: txExecute, select: txSelect, delete: txDelete }),
    );
    hasEmailTemplateMediaReferences.mockResolvedValue(true);

    await expect(deleteFolderCascade(1)).rejects.toThrow("media_in_use");

    expect(txDelete).not.toHaveBeenCalled();
    expect(removeStoredMediaAsset).not.toHaveBeenCalled();
  });
});
