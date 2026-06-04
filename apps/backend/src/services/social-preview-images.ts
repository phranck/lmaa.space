import type { SocialPreviewImageEntry, SocialPreviewProjectEntry } from "@lmaa/contracts";

import { ensureSocialMediaFolder } from "./admin-folders.js";
import { deleteManagedMediaAsset, uploadManagedMediaAsset } from "./admin-media.js";
import { deleteSetting, getSetting, putSetting } from "../repositories/app-settings.js";
import {
  createSocialPreviewImage,
  createSocialPreviewProject,
  countSocialPreviewImagesByMediaAssetId,
  deleteSocialPreviewImage,
  deleteSocialPreviewProject,
  getSocialPreviewImageById,
  getSocialPreviewProjectById,
  listSocialPreviewImages,
  listSocialPreviewProjects,
  updateSocialPreviewProject,
  type SocialPreviewImageCreateData,
  type SocialPreviewProjectCreateData,
  type SocialPreviewProjectUpdateData,
} from "../repositories/social-preview-images.js";

const ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY = "socialPreview.activeImageId";

async function getActiveSocialPreviewImageId(): Promise<number | null> {
  const value = await getSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapSocialPreviewProject(
  row: Awaited<ReturnType<typeof listSocialPreviewProjects>>[number],
): SocialPreviewProjectEntry {
  return {
    id: row.id,
    name: row.name,
    composition: row.composition,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
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

export async function listManagedSocialPreviewProjects(): Promise<SocialPreviewProjectEntry[]> {
  const rows = await listSocialPreviewProjects();
  return rows.map(mapSocialPreviewProject);
}

export async function createManagedSocialPreviewProject(
  data: SocialPreviewProjectCreateData,
): Promise<SocialPreviewProjectEntry> {
  const row = await createSocialPreviewProject(data);
  if (!row) {
    throw new Error("Failed to create social preview project");
  }
  return mapSocialPreviewProject(row);
}

export async function updateManagedSocialPreviewProject(
  id: number,
  data: SocialPreviewProjectUpdateData,
) {
  const current = await getSocialPreviewProjectById(id);
  if (!current) return { ok: false as const, reason: "not_found" as const };

  const row = await updateSocialPreviewProject(id, data);
  if (!row) {
    throw new Error("Failed to update social preview project");
  }
  return { ok: true as const, project: mapSocialPreviewProject(row) };
}

export async function deleteManagedSocialPreviewProject(id: number) {
  const deleted = await deleteSocialPreviewProject(id);
  if (!deleted) return { ok: false as const, reason: "not_found" as const };

  return { ok: true as const };
}

export async function listManagedSocialPreviewImages(): Promise<SocialPreviewImageEntry[]> {
  const [rows, activeId] = await Promise.all([
    listSocialPreviewImages(),
    getActiveSocialPreviewImageId(),
  ]);
  return rows.map((row) => mapSocialPreviewImage(row, activeId));
}

export async function uploadManagedSocialPreviewAsset(input: {
  adminId: number;
  displayName?: string;
  file: unknown;
  overwrite?: boolean;
}) {
  const folder = await ensureSocialMediaFolder();
  return uploadManagedMediaAsset({
    adminId: input.adminId,
    displayName: input.displayName,
    file: input.file,
    folderId: folder.id,
    overwrite: input.overwrite ?? true,
  });
}

function getRemoteImageFilename(url: string, contentType: string, displayName?: string) {
  const extension = contentType.includes("webp")
    ? "webp"
    : contentType.includes("png")
      ? "png"
      : "jpg";
  const safeName = (displayName?.trim() || new URL(url).pathname.split("/").pop() || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[/\\]/g, " ")
    .trim();
  return `${safeName || "image"}.${extension}`;
}

export async function importManagedSocialPreviewAssetFromUrl(input: {
  adminId: number;
  displayName?: string;
  imageUrl: string;
  overwrite?: boolean;
}) {
  const url = new URL(input.imageUrl);
  if (url.protocol !== "https:" || url.hostname !== "images.unsplash.com") {
    return { ok: false as const, reason: "invalid_url" as const };
  }

  const response = await fetch(url);
  if (!response.ok) {
    return { ok: false as const, reason: "download_failed" as const };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return { ok: false as const, reason: "invalid_file" as const };
  }

  const buffer = await response.arrayBuffer();
  const file = new File(
    [buffer],
    getRemoteImageFilename(input.imageUrl, contentType, input.displayName),
    {
      type: contentType,
    },
  );

  return uploadManagedSocialPreviewAsset({
    adminId: input.adminId,
    displayName: input.displayName,
    file,
    overwrite: input.overwrite ?? true,
  });
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

  if (deleted.mediaAssetId) {
    const remainingReferences = await countSocialPreviewImagesByMediaAssetId(deleted.mediaAssetId);
    if (remainingReferences === 0) {
      await deleteManagedMediaAsset(deleted.mediaAssetId);
    }
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
