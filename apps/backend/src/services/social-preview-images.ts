import type { SocialPreviewImageEntry } from "@lmaa/contracts";

import { deleteSetting, getSetting, putSetting } from "../repositories/app-settings.js";
import {
  createSocialPreviewImage,
  deleteSocialPreviewImage,
  getSocialPreviewImageById,
  listSocialPreviewImages,
  type SocialPreviewImageCreateData,
} from "../repositories/social-preview-images.js";

const ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY = "socialPreview.activeImageId";

async function getActiveSocialPreviewImageId(): Promise<number | null> {
  const value = await getSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapSocialPreviewImage(
  row: Awaited<ReturnType<typeof listSocialPreviewImages>>[number],
  activeId: number | null,
): SocialPreviewImageEntry {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    mediaAssetId: row.mediaAssetId,
    composition: row.composition,
    width: row.width,
    height: row.height,
    format: row.format,
    quality: row.quality,
    sizeBytes: row.sizeBytes,
    isActive: row.id === activeId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
}

export async function listManagedSocialPreviewImages(): Promise<SocialPreviewImageEntry[]> {
  const [rows, activeId] = await Promise.all([
    listSocialPreviewImages(),
    getActiveSocialPreviewImageId(),
  ]);
  return rows.map((row) => mapSocialPreviewImage(row, activeId));
}

export async function createManagedSocialPreviewImage(
  data: SocialPreviewImageCreateData & { activate?: boolean },
): Promise<SocialPreviewImageEntry> {
  const row = await createSocialPreviewImage(data);
  if (!row) {
    throw new Error("Failed to create social preview image");
  }

  if (data.activate) {
    await putSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY, String(row.id));
  }

  const activeId = data.activate ? row.id : await getActiveSocialPreviewImageId();
  return mapSocialPreviewImage(row, activeId);
}

export async function setManagedSocialPreviewImageActive(id: number, active: boolean) {
  const row = await getSocialPreviewImageById(id);
  if (!row) return { ok: false as const, reason: "not_found" as const };

  if (active) {
    await putSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY, String(id));
  } else {
    const currentId = await getActiveSocialPreviewImageId();
    if (currentId === id) {
      await deleteSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
    }
  }

  const activeId = active ? id : await getActiveSocialPreviewImageId();
  return { ok: true as const, image: mapSocialPreviewImage(row, activeId) };
}

export async function deleteManagedSocialPreviewImage(id: number) {
  const deleted = await deleteSocialPreviewImage(id);
  if (!deleted) return { ok: false as const, reason: "not_found" as const };

  const currentId = await getActiveSocialPreviewImageId();
  if (currentId === id) {
    await deleteSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  }

  return { ok: true as const };
}

/**
 * Returns the globally active social preview image for Open Graph/Twitter cards.
 */
export async function getSocialPreviewImage(): Promise<{ url: string } | null> {
  const activeId = await getActiveSocialPreviewImageId();
  if (!activeId) return null;

  const row = await getSocialPreviewImageById(activeId);
  if (!row) {
    await deleteSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
    return null;
  }

  return { url: row.imageUrl };
}
