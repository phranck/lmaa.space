import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendStorageCommand = vi.fn();
const deleteMediaAsset = vi.fn();
const findMediaAssetByDisplayNameInsensitive = vi.fn();
const getMediaAssetById = vi.fn();
const replaceMediaAssetStorage = vi.fn();
const countEmailTemplateMediaReferences = vi.fn();

const existingAsset = {
  id: 7,
  displayName: "Default Preview",
  originalName: "default-preview.jpg",
  storedFilename: "existing-default-preview.jpg",
  posterStoredFilename: null,
  alias: null,
  mimeType: "image/jpeg",
  kind: "image",
  sizeBytes: 100,
  width: 1200,
  height: 630,
  folderId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  createdByUsername: "admin",
};

async function loadServiceModule() {
  vi.resetModules();

  vi.doMock("../config/env.js", () => ({
    env: {
      NODE_ENV: "test",
      FRONTEND_URL: "https://lmaa.test",
      S3_ENDPOINT: "https://storage.example",
      S3_BUCKET: "media",
      S3_ACCESS_KEY_ID: "test",
      S3_SECRET_ACCESS_KEY: "test",
    },
  }));

  vi.doMock("@aws-sdk/client-s3", async () => {
    const actual = await vi.importActual<typeof import("@aws-sdk/client-s3")>("@aws-sdk/client-s3");
    return {
      ...actual,
      S3Client: class {
        send = sendStorageCommand;
      },
    };
  });

  vi.doMock("../repositories/admin-media.js", () => ({
    createMediaAsset: vi.fn(),
    deleteMediaAsset,
    deleteMediaAssetByFilename: vi.fn(),
    findMediaAssetByDisplayNameInsensitive,
    getMediaAssetById,
    listMediaAliases: vi.fn(),
    listMediaAssets: vi.fn(),
    listMediaAssetsByFolder: vi.fn(),
    replaceMediaAssetStorage,
    updateMediaAssetMeta: vi.fn(),
  }));

  vi.doMock("../repositories/email-templates.js", () => ({
    countEmailTemplateMediaReferences,
  }));

  return import("../services/admin-media.js");
}

describe("managed media", () => {
  beforeEach(() => {
    sendStorageCommand.mockReset();
    sendStorageCommand.mockResolvedValue({});
    deleteMediaAsset.mockReset();
    deleteMediaAsset.mockResolvedValue(existingAsset);
    findMediaAssetByDisplayNameInsensitive.mockReset();
    findMediaAssetByDisplayNameInsensitive.mockResolvedValue(existingAsset);
    getMediaAssetById.mockReset();
    getMediaAssetById.mockResolvedValue(existingAsset);
    replaceMediaAssetStorage.mockReset();
    replaceMediaAssetStorage.mockImplementation(async (_id, data) => ({
      ...existingAsset,
      ...data,
      posterStoredFilename: data.posterStoredFilename ?? null,
    }));
    countEmailTemplateMediaReferences.mockReset();
    countEmailTemplateMediaReferences.mockResolvedValue(0);
  });

  it("keeps the stable public URL when overwrite changes the storage key", async () => {
    const service = await loadServiceModule();
    const imageBuffer = await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const result = await service.uploadManagedMediaAsset({
      adminId: 1,
      displayName: "Default Preview",
      file: new File([imageBuffer], "replacement.png", { type: "image/png" }),
      overwrite: true,
    });

    expect(result).toMatchObject({
      ok: true,
      asset: {
        url: "https://lmaa.test/api/v1/media/7/content",
      },
    });
    const putCommand = sendStorageCommand.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof PutObjectCommand);
    expect(putCommand?.input.Key).not.toBe("existing-default-preview.jpg");
  });

  it("refuses to delete an asset referenced by an email template", async () => {
    countEmailTemplateMediaReferences.mockResolvedValue(1);
    const service = await loadServiceModule();

    const result = await service.deleteManagedMediaAsset(existingAsset.id);

    expect(result).toEqual({ ok: false, reason: "in_use" });
    expect(deleteMediaAsset).not.toHaveBeenCalled();
    expect(
      sendStorageCommand.mock.calls.some(([command]) => command instanceof DeleteObjectCommand),
    ).toBe(false);
  });
});
