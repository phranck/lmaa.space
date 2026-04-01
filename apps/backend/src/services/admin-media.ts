import type { MediaAsset as SharedMediaAsset } from "@lmaa/shared";

import { fetchFullUnsplashPhoto } from "./unsplash.js";
import {
  type UnsplashCacheObject,
  type S3MediaMeta,
  getMediaPublicUrl,
  listAllStoredMedia,
  listUnsplashCacheObjects,
  purgeUnsplashCache,
  putUnsplashCacheImage,
  removeStoredMedia,
  deleteUnsplashCacheImage,
  storeUploadedMedia,
  updateStoredMediaMeta,
} from "../lib/media-storage.js";
import {
  createMediaAsset,
  deleteMediaAsset,
  deleteMediaAssetByFilename,
  listMediaAliases,
  listMediaAssets,
  updateMediaAssetMeta,
} from "../repositories/admin-media.js";
import {
  linkCategoryToUnsplashImage,
  listAllUnsplashImages,
  listUnlinkedUnsplashCategories,
  listUnsplashCacheSources,
  upsertUnsplashImage,
} from "../repositories/unsplash-images.js";

export type { UnsplashCacheSource } from "../repositories/unsplash-images.js";

function mapMediaAsset(row: {
  id: number;
  displayName: string;
  originalName: string;
  storedFilename: string;
  alias: string | null;
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
    alias: row.alias,
    mimeType: row.mimeType,
    kind: row.kind,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    url: getMediaPublicUrl(row.storedFilename),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
}

export type { UnsplashCacheObject };

export interface UnsplashCacheMediaItem extends UnsplashCacheObject {
  unsplash: {
    unsplashId: string;
    width: number | null;
    height: number | null;
    color: string | null;
    blurHash: string | null;
    description: string | null;
    altDescription: string | null;
    likes: number | null;
    photographerName: string;
    photographerUrl: string;
    locationCity: string | null;
    locationCountry: string | null;
    createdAtUnsplash: string | null;
  } | null;
}

export async function listUnsplashCacheMediaItems(): Promise<UnsplashCacheMediaItem[]> {
  const [cacheObjects, allUnsplash] = await Promise.all([
    listUnsplashCacheObjects(),
    listAllUnsplashImages(),
  ]);

  const unsplashById = new Map(allUnsplash.map((u) => [u.id, u]));

  return cacheObjects.map((obj) => {
    const u = unsplashById.get(obj.unsplashImageId);
    return {
      ...obj,
      unsplash: u ? {
        unsplashId: u.unsplashId,
        width: u.width,
        height: u.height,
        color: u.color,
        blurHash: u.blurHash,
        description: u.description,
        altDescription: u.altDescription,
        likes: u.likes,
        photographerName: u.photographerName,
        photographerUrl: u.photographerUrl,
        locationCity: u.locationCity,
        locationCountry: u.locationCountry,
        createdAtUnsplash: u.createdAtUnsplash?.toISOString() ?? null,
      } : null,
    };
  });
}

export async function refetchSingleUnsplashMeta(
  unsplashId: string,
  cacheType: "hero" | "categorie",
): Promise<boolean> {
  const data = await fetchFullUnsplashPhoto(unsplashId);
  if (!data) return false;

  const row = await upsertUnsplashImage({
    unsplashId,
    urlSmall: data.urlSmall,
    urlRegular: data.urlRegular,
    width: data.width,
    height: data.height,
    color: data.color,
    blurHash: data.blurHash,
    description: data.description,
    altDescription: data.altDescription,
    likes: data.likes,
    photographerName: data.photographerName,
    photographerUrl: data.photographerUrl,
    downloadLocation: data.downloadLocation,
    createdAtUnsplash: new Date(data.createdAtUnsplash),
    locationCity: data.locationCity,
    locationCountry: data.locationCountry,
    locationLat: data.locationLat,
    locationLng: data.locationLng,
    locationFetched: true,
  });

  // Re-download and cache the image
  try {
    const res = await fetch(data.urlRegular);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      await putUnsplashCacheImage(cacheType, row.id, buffer);
    }
  } catch {
    // Image re-cache is best-effort
  }

  return true;
}

/**
 * Extracts the URL path (without query params) for comparison.
 */
function unsplashUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Backfills `unsplashImageId` for categories with Unsplash image URLs but
 * no FK set, matching by URL path against existing unsplash_images rows.
 */
async function backfillCategoryUnsplashIds(): Promise<void> {
  const unlinked = await listUnlinkedUnsplashCategories();
  if (unlinked.length === 0) return;

  const allUnsplash = await listAllUnsplashImages();
  const unsplashByPath = new Map(
    allUnsplash.map((u) => [unsplashUrlPath(u.urlRegular), u]),
  );

  for (const cat of unlinked) {
    const path = unsplashUrlPath(cat.imageUrl);
    const match = unsplashByPath.get(path);
    if (match) {
      await linkCategoryToUnsplashImage(cat.id, match.id);
    }
  }
}

export async function getUnsplashCacheSources() {
  await backfillCategoryUnsplashIds();
  return listUnsplashCacheSources();
}

export async function deleteUnsplashCacheItem(
  type: "hero" | "categorie",
  unsplashImageId: number,
): Promise<void> {
  await deleteUnsplashCacheImage(type, unsplashImageId);
}

export async function purgeUnsplashCacheItems(): Promise<{ deleted: number }> {
  const deleted = await purgeUnsplashCache();
  return { deleted };
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

export async function updateManagedMediaAsset(
  id: number,
  data: { displayName: string; alias?: string | null },
) {
  const asset = await updateMediaAssetMeta(id, data);
  if (!asset) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const meta: S3MediaMeta = {
    displayName: asset.displayName,
    originalName: asset.originalName,
    alias: asset.alias,
    kind: asset.kind,
    width: asset.width,
    height: asset.height,
  };

  try {
    await updateStoredMediaMeta(asset.storedFilename, meta);
  } catch {
    // S3 metadata update is best-effort; DB is the primary store
  }

  return { ok: true as const, asset: mapMediaAsset(asset) };
}

export async function getMediaAliasMap(): Promise<Record<string, string>> {
  const rows = await listMediaAliases();
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.alias) {
      map[row.alias] = getMediaPublicUrl(row.storedFilename);
    }
  }
  return map;
}

export async function deleteManagedMediaAsset(id: number) {
  const deleted = await deleteMediaAsset(id);
  if (!deleted) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await removeStoredMedia(deleted.storedFilename);
  return { ok: true as const };
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);

function inferKindFromContentType(contentType: string): "image" | "document" {
  return contentType.startsWith("image/") ? "image" : "document";
}

function inferExtension(key: string): string {
  const dot = key.lastIndexOf(".");
  return dot >= 0 ? key.slice(dot).toLowerCase() : "";
}

export async function syncMediaFromStorage(): Promise<{
  created: number;
  updated: number;
  removed: number;
}> {
  const [s3Objects, dbAssets] = await Promise.all([listAllStoredMedia(), listMediaAssets()]);

  const dbByFilename = new Map(dbAssets.map((a) => [a.storedFilename, a]));
  const s3Keys = new Set(s3Objects.map((o) => o.key));

  let created = 0;
  let updated = 0;
  let removed = 0;

  // Create or update DB entries from S3 objects
  for (const obj of s3Objects) {
    const existing = dbByFilename.get(obj.key);
    const meta = obj.metadata;
    const kind = (meta.kind as "image" | "document") || inferKindFromContentType(obj.contentType);
    const displayName = meta.displayName || obj.key;
    const originalName = meta.originalName || obj.key;
    const alias = meta.alias || null;

    if (!existing) {
      await createMediaAsset({
        displayName,
        originalName,
        storedFilename: obj.key,
        mimeType: obj.contentType,
        kind,
        sizeBytes: obj.size,
        width: meta.width ?? null,
        height: meta.height ?? null,
        createdBy: null,
        alias,
      });
      created += 1;
    } else {
      // Update DB from S3 metadata if S3 has richer data
      const needsUpdate =
        (meta.displayName && meta.displayName !== existing.displayName) ||
        (meta.alias !== undefined && meta.alias !== existing.alias);

      if (needsUpdate) {
        await updateMediaAssetMeta(existing.id, {
          displayName: meta.displayName || existing.displayName,
          alias: meta.alias !== undefined ? meta.alias : existing.alias,
        });
        updated += 1;
      }
    }
  }

  // Remove DB entries for files no longer in S3
  for (const asset of dbAssets) {
    if (!s3Keys.has(asset.storedFilename)) {
      await deleteMediaAssetByFilename(asset.storedFilename);
      removed += 1;
    }
  }

  return { created, updated, removed };
}
