import type { MediaAsset as SharedMediaAsset } from "@lmaa/shared";

import { removeStoredMedia, storeUploadedMedia } from "../lib/media-storage.js";
import {
  createMediaAsset,
  deleteMediaAsset,
  listMediaAssets,
  updateMediaAssetDisplayName,
} from "../repositories/admin-media.js";

function mapMediaAsset(row: {
  id: number;
  displayName: string;
  originalName: string;
  storedFilename: string;
  mimeType: string;
  kind: "image" | "document";
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdByUsername: string | null;
}): SharedMediaAsset {
  return {
    id: row.id,
    displayName: row.displayName,
    originalName: row.originalName,
    storedFilename: row.storedFilename,
    mimeType: row.mimeType,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    url: `/uploads/${row.storedFilename}`,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
}

export async function listManagedMediaAssets(): Promise<SharedMediaAsset[]> {
  const assets = await listMediaAssets();
  return assets.map(mapMediaAsset);
}

export async function uploadManagedMediaAsset(input: { file: unknown; adminId: number }) {
  const stored = await storeUploadedMedia(input.file);
  if (!stored.ok) {
    return stored;
  }

  try {
    const asset = await createMediaAsset({
      ...stored.created,
      createdBy: input.adminId,
    });

    if (!asset) {
      await removeStoredMedia(stored.created.storedFilename);
      return { ok: false as const, reason: "save_failed" as const };
    }

    return { ok: true as const, asset: mapMediaAsset(asset) };
  } catch (error) {
    await removeStoredMedia(stored.created.storedFilename);
    throw error;
  }
}

export async function renameManagedMediaAsset(id: number, displayName: string) {
  const asset = await updateMediaAssetDisplayName(id, displayName);
  if (!asset) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, asset: mapMediaAsset(asset) };
}

export async function deleteManagedMediaAsset(id: number) {
  const deleted = await deleteMediaAsset(id);
  if (!deleted) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await removeStoredMedia(deleted.storedFilename);
  return { ok: true as const };
}
