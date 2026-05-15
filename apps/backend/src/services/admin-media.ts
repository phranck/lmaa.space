import {
  HLS_MANIFEST_MIME_TYPE,
  type MediaAsset as SharedMediaAsset,
  type MediaKind,
} from "@lmaa/shared";

import {
  completeStagedHlsBundle,
  type S3MediaMeta,
  type StagedHlsBundleFile,
  type StoreHlsBundleFile,
  getMediaPublicUrl,
  isHlsManifestKey,
  listAllStoredMedia,
  removeStoredMedia,
  removeStoredMediaAsset,
  stageUploadedHlsBundleFiles,
  storeUploadedMedia,
  storeUploadedHlsBundle,
  updateStoredMediaMeta,
} from "../lib/media-storage.js";
import {
  createMediaAsset,
  deleteMediaAsset,
  deleteMediaAssetByFilename,
  findMediaAssetByDisplayNameInsensitive,
  listMediaAliases,
  listMediaAssets,
  replaceMediaAssetStorage,
  updateMediaAssetMeta,
} from "../repositories/admin-media.js";

function mapMediaAsset(row: {
  id: number;
  displayName: string;
  originalName: string;
  storedFilename: string;
  posterStoredFilename: string | null;
  alias: string | null;
  mimeType: string;
  kind: MediaKind;
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
    posterUrl: row.posterStoredFilename ? getMediaPublicUrl(row.posterStoredFilename) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByUsername: row.createdByUsername,
  };
}

function sanitizeUploadDisplayName(raw: string): string {
  const cleaned = raw.replace(/[/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  return cleaned || "file";
}

function isManagedMediaStorageKey(key: string): boolean {
  return !key.startsWith(".") && !key.startsWith("unsplash/");
}

async function findUploadNameConflict(displayName: string) {
  return findMediaAssetByDisplayNameInsensitive(sanitizeUploadDisplayName(displayName));
}

async function persistStoredUpload(input: {
  adminId: number;
  created: {
    displayName: string;
    originalName: string;
    storedFilename: string;
    posterStoredFilename: string | null;
    mimeType: string;
    kind: MediaKind;
    sizeBytes: number;
    width: number | null;
    height: number | null;
  };
  overwriteTarget: Awaited<ReturnType<typeof findMediaAssetByDisplayNameInsensitive>>;
}) {
  const { adminId, created, overwriteTarget } = input;

  if (overwriteTarget) {
    const previousStoredFilename = overwriteTarget.storedFilename;
    const asset = await replaceMediaAssetStorage(overwriteTarget.id, {
      ...created,
      alias: overwriteTarget.alias,
      createdBy: adminId,
    });

    if (!asset) {
      await removeStoredMediaAsset(created.storedFilename);
      return { ok: false as const, reason: "save_failed" as const };
    }

    try {
      await removeStoredMediaAsset(previousStoredFilename);
    } catch {
      // Best effort: the DB already points at the replacement object.
    }
    return { ok: true as const, asset: mapMediaAsset(asset) };
  }

  const asset = await createMediaAsset({
    ...created,
    createdBy: adminId,
  });

  if (!asset) {
    await removeStoredMediaAsset(created.storedFilename);
    return { ok: false as const, reason: "save_failed" as const };
  }

  return { ok: true as const, asset: mapMediaAsset(asset) };
}

export async function listManagedMediaAssets(): Promise<SharedMediaAsset[]> {
  const assets = await listMediaAssets();
  return assets.map(mapMediaAsset);
}

export async function uploadManagedMediaAsset(input: {
  adminId: number;
  displayName?: string;
  file: unknown;
  overwrite?: boolean;
}) {
  const requestedDisplayName =
    input.displayName ?? (input.file instanceof File && input.file.name ? input.file.name : "file");
  const conflict = await findUploadNameConflict(requestedDisplayName);
  if (conflict && !input.overwrite) {
    return { ok: false as const, reason: "name_conflict" as const, asset: mapMediaAsset(conflict) };
  }

  const stored = await storeUploadedMedia(input.file, {
    alias: conflict?.alias ?? null,
    displayName: requestedDisplayName,
  });
  if (!stored.ok) {
    return stored;
  }

  try {
    return await persistStoredUpload({
      adminId: input.adminId,
      created: stored.created,
      overwriteTarget: input.overwrite ? conflict : null,
    });
  } catch (error) {
    await removeStoredMedia(stored.created.storedFilename);
    throw error;
  }
}

export async function uploadManagedHlsBundle(input: {
  adminId: number;
  displayName: string;
  files: StoreHlsBundleFile[];
  overwrite?: boolean;
}) {
  const conflict = await findUploadNameConflict(input.displayName);
  if (conflict && !input.overwrite) {
    return { ok: false as const, reason: "name_conflict" as const, asset: mapMediaAsset(conflict) };
  }

  const stored = await storeUploadedHlsBundle({
    alias: conflict?.alias ?? null,
    displayName: input.displayName,
    files: input.files,
  });
  if (!stored.ok) {
    return stored;
  }

  try {
    return await persistStoredUpload({
      adminId: input.adminId,
      created: stored.created,
      overwriteTarget: input.overwrite ? conflict : null,
    });
  } catch (error) {
    await removeStoredMediaAsset(stored.created.storedFilename);
    throw error;
  }
}

export async function uploadManagedHlsBundleChunk(input: {
  files: StoreHlsBundleFile[];
  sessionId: string;
}) {
  return stageUploadedHlsBundleFiles({
    files: input.files,
    sessionId: input.sessionId,
  });
}

export async function completeManagedHlsBundleUpload(input: {
  adminId: number;
  displayName: string;
  files: StagedHlsBundleFile[];
  overwrite?: boolean;
  sessionId: string;
}) {
  const conflict = await findUploadNameConflict(input.displayName);
  if (conflict && !input.overwrite) {
    return { ok: false as const, reason: "name_conflict" as const, asset: mapMediaAsset(conflict) };
  }

  const stored = await completeStagedHlsBundle({
    alias: conflict?.alias ?? null,
    displayName: input.displayName,
    files: input.files,
    sessionId: input.sessionId,
  });
  if (!stored.ok) {
    return stored;
  }

  try {
    return await persistStoredUpload({
      adminId: input.adminId,
      created: stored.created,
      overwriteTarget: input.overwrite ? conflict : null,
    });
  } catch (error) {
    await removeStoredMediaAsset(stored.created.storedFilename);
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

export async function getMediaShortcodeAssetMap(): Promise<
  Record<string, { url: string; posterUrl: string | null }>
> {
  const rows = await listMediaAliases();
  const map: Record<string, { url: string; posterUrl: string | null }> = {};
  for (const row of rows) {
    if (row.alias) {
      map[row.alias] = {
        url: getMediaPublicUrl(row.storedFilename),
        posterUrl: row.posterStoredFilename ? getMediaPublicUrl(row.posterStoredFilename) : null,
      };
    }
  }
  return map;
}

export async function deleteManagedMediaAsset(id: number) {
  const deleted = await deleteMediaAsset(id);
  if (!deleted) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await removeStoredMediaAsset(deleted.storedFilename);
  return { ok: true as const };
}

function inferKindFromContentType(contentType: string): MediaKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return "document";
}

export async function syncMediaFromStorage(): Promise<{
  created: number;
  updated: number;
  removed: number;
}> {
  const [allS3Objects, dbAssets] = await Promise.all([listAllStoredMedia(), listMediaAssets()]);
  const s3Objects = allS3Objects.filter((obj) => isManagedMediaStorageKey(obj.key));

  const dbByFilename = new Map(dbAssets.map((a) => [a.storedFilename, a]));
  const s3Keys = new Set(s3Objects.map((o) => o.key));
  const hlsManifests = s3Objects.filter(
    (obj) => obj.contentType === HLS_MANIFEST_MIME_TYPE || isHlsManifestKey(obj.key),
  );
  const hlsBundleChildren = new Set<string>();
  const hlsBundleObjectsByManifest = new Map<string, typeof s3Objects>();
  const hlsPosterByManifest = new Map<string, string | null>();

  for (const manifest of hlsManifests) {
    const prefix = manifest.key.slice(0, manifest.key.lastIndexOf("/") + 1);
    const bundleObjects = prefix
      ? s3Objects.filter((obj) => obj.key.startsWith(prefix))
      : [manifest];

    hlsBundleObjectsByManifest.set(manifest.key, bundleObjects);
    let posterStoredFilename: string | null = null;
    for (const obj of bundleObjects) {
      if (obj.key !== manifest.key) {
        hlsBundleChildren.add(obj.key);
      }
      if (/\/poster\.(?:jpe?g|png|webp)$/i.test(`/${obj.key}`)) {
        posterStoredFilename = obj.key;
      }
    }
    hlsPosterByManifest.set(manifest.key, posterStoredFilename);
  }

  const [syncResults, removalResults] = await Promise.all([
    Promise.all(
      s3Objects.map(async (obj) => {
        if (hlsBundleChildren.has(obj.key)) return { created: 0, updated: 0 };

        const existing = dbByFilename.get(obj.key);
        const meta = obj.metadata;
        const bundleObjects = hlsBundleObjectsByManifest.get(obj.key);
        const isHlsBundle = bundleObjects !== undefined;
        const kind = isHlsBundle
          ? "video"
          : (meta.kind as MediaKind) || inferKindFromContentType(obj.contentType);
        const displayName = meta.displayName || obj.key;
        const originalName = meta.originalName || obj.key;
        const alias = meta.alias || null;
        const sizeBytes = bundleObjects?.reduce((sum, item) => sum + item.size, 0) ?? obj.size;
        const mimeType = isHlsBundle ? HLS_MANIFEST_MIME_TYPE : obj.contentType;
        const posterStoredFilename = isHlsBundle
          ? (hlsPosterByManifest.get(obj.key) ?? null)
          : null;

        if (!existing) {
          await createMediaAsset({
            displayName,
            originalName,
            storedFilename: obj.key,
            mimeType,
            kind,
            sizeBytes,
            width: meta.width ?? null,
            height: meta.height ?? null,
            createdBy: null,
            alias,
            posterStoredFilename,
          });
          return { created: 1, updated: 0 };
        }

        const needsUpdate =
          (meta.displayName && meta.displayName !== existing.displayName) ||
          (meta.alias !== undefined && meta.alias !== existing.alias) ||
          posterStoredFilename !== existing.posterStoredFilename;

        if (needsUpdate) {
          await updateMediaAssetMeta(existing.id, {
            displayName: meta.displayName || existing.displayName,
            alias: meta.alias !== undefined ? meta.alias : existing.alias,
            posterStoredFilename,
          });
          return { created: 0, updated: 1 };
        }

        return { created: 0, updated: 0 };
      }),
    ),
    Promise.all(
      dbAssets.map(async (asset): Promise<number> => {
        if (hlsBundleChildren.has(asset.storedFilename) || !s3Keys.has(asset.storedFilename)) {
          await deleteMediaAssetByFilename(asset.storedFilename);
          return 1;
        }
        return 0;
      }),
    ),
  ]);

  const created = syncResults.reduce((sum, result) => sum + result.created, 0);
  const updated = syncResults.reduce((sum, result) => sum + result.updated, 0);
  const removed = removalResults.reduce((sum, result) => sum + result, 0);

  return { created, updated, removed };
}
