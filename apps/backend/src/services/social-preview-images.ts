import type {
  SocialPreviewImageEntry,
  SocialPreviewProjectEntry,
  SocialPreviewPublicImage,
} from "@lmaa/contracts";

import { ensureSocialMediaFolder } from "./admin-folders.js";
import { deleteManagedMediaAsset, uploadManagedMediaAsset } from "./admin-media.js";
import { readBodyWithLimit } from "../lib/http-body.js";
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
  updateSocialPreviewImage,
  updateSocialPreviewProject,
  type SocialPreviewImageCreateData,
  type SocialPreviewProjectCreateData,
  type SocialPreviewProjectUpdateData,
} from "../repositories/social-preview-images.js";

/**
 * Byte budget for an image pulled in from the remote host. Well above any real
 * Unsplash asset, and low enough that a body which never ends cannot exhaust
 * memory.
 */
const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;

const ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY = "socialPreview.activeImageId";
const DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY = "socialPreview.defaultImageId";

async function getActiveSocialPreviewImageId(): Promise<number | null> {
  const value = await getSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getDefaultSocialPreviewImageId(): Promise<number | null> {
  const value = await getSetting(DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY);
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
  defaultId: number | null,
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
    isDefault: row.id === defaultId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
}

function mapSocialPreviewPublicImage(
  row: Awaited<ReturnType<typeof getSocialPreviewImageById>>,
): SocialPreviewPublicImage | null {
  if (!row) return null;
  return {
    id: row.id,
    url: row.imageUrl,
    version: `${row.id}-${row.updatedAt.getTime()}`,
    updatedAt: row.updatedAt.toISOString(),
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
  const [rows, activeId, defaultId] = await Promise.all([
    listSocialPreviewImages(),
    getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  return rows.map((row) => mapSocialPreviewImage(row, activeId, defaultId));
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

  const buffer = await readBodyWithLimit(response, MAX_REMOTE_IMAGE_BYTES);
  if (buffer === null) {
    return { ok: false as const, reason: "download_failed" as const };
  }

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

  const [activeId, defaultId] = await Promise.all([
    data.activate ? Promise.resolve(row.id) : getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  return mapSocialPreviewImage(row, activeId, defaultId);
}

export async function updateManagedSocialPreviewImage(id: number, data: { name: string }) {
  const current = await getSocialPreviewImageById(id);
  if (!current) return { ok: false as const, reason: "not_found" as const };

  const row = await updateSocialPreviewImage(id, data);
  if (!row) {
    throw new Error("Failed to update social preview image");
  }

  const [activeId, defaultId] = await Promise.all([
    getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  return { ok: true as const, image: mapSocialPreviewImage(row, activeId, defaultId) };
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

  const [activeId, defaultId] = await Promise.all([
    active ? Promise.resolve(id) : getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  return { ok: true as const, image: mapSocialPreviewImage(row, activeId, defaultId) };
}

export async function setManagedSocialPreviewImageDefault(id: number, isDefault: boolean) {
  const row = await getSocialPreviewImageById(id);
  if (!row) return { ok: false as const, reason: "not_found" as const };

  if (isDefault) {
    await putSetting(DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY, String(id));
  } else {
    const currentId = await getDefaultSocialPreviewImageId();
    if (currentId === id) {
      await deleteSetting(DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY);
    }
  }

  const [activeId, defaultId] = await Promise.all([
    getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  return { ok: true as const, image: mapSocialPreviewImage(row, activeId, defaultId) };
}

export async function deleteManagedSocialPreviewImage(id: number) {
  const deleted = await deleteSocialPreviewImage(id);
  if (!deleted) return { ok: false as const, reason: "not_found" as const };

  const [currentId, defaultId] = await Promise.all([
    getActiveSocialPreviewImageId(),
    getDefaultSocialPreviewImageId(),
  ]);
  if (currentId === id) {
    await deleteSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  }
  if (defaultId === id) {
    await deleteSetting(DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY);
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
export async function getSocialPreviewImage(): Promise<SocialPreviewPublicImage | null> {
  const activeId = await getActiveSocialPreviewImageId();
  if (activeId) {
    const row = await getSocialPreviewImageById(activeId);
    const image = mapSocialPreviewPublicImage(row);
    if (image) return image;
    await deleteSetting(ACTIVE_SOCIAL_PREVIEW_IMAGE_KEY);
  }

  const defaultId = await getDefaultSocialPreviewImageId();
  if (!defaultId) return null;

  const row = await getSocialPreviewImageById(defaultId);
  if (!row) {
    await deleteSetting(DEFAULT_SOCIAL_PREVIEW_IMAGE_KEY);
    return null;
  }

  return mapSocialPreviewPublicImage(row);
}
