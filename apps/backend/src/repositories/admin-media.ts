import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { MediaKind } from "@lmaa/shared";

import { db } from "../db/client.js";
import { adminUsers, mediaAssets } from "../db/schema.js";

const MEDIA_SELECT_FIELDS = {
  id: mediaAssets.id,
  displayName: mediaAssets.displayName,
  originalName: mediaAssets.originalName,
  storedFilename: mediaAssets.storedFilename,
  posterStoredFilename: mediaAssets.posterStoredFilename,
  alias: mediaAssets.alias,
  mimeType: mediaAssets.mimeType,
  kind: mediaAssets.kind,
  sizeBytes: mediaAssets.sizeBytes,
  width: mediaAssets.width,
  height: mediaAssets.height,
  folderId: mediaAssets.folderId,
  createdAt: mediaAssets.createdAt,
  updatedAt: mediaAssets.updatedAt,
  createdByUsername: adminUsers.username,
};

export async function listMediaAssets() {
  return db
    .select(MEDIA_SELECT_FIELDS)
    .from(mediaAssets)
    .leftJoin(adminUsers, eq(mediaAssets.createdBy, adminUsers.id))
    .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id));
}

export async function listMediaAssetsByFolder(folderId: number | null) {
  return db
    .select(MEDIA_SELECT_FIELDS)
    .from(mediaAssets)
    .leftJoin(adminUsers, eq(mediaAssets.createdBy, adminUsers.id))
    .where(folderId === null ? isNull(mediaAssets.folderId) : eq(mediaAssets.folderId, folderId))
    .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id));
}

async function getMediaAssetById(id: number) {
  const [asset] = await db
    .select(MEDIA_SELECT_FIELDS)
    .from(mediaAssets)
    .leftJoin(adminUsers, eq(mediaAssets.createdBy, adminUsers.id))
    .where(eq(mediaAssets.id, id))
    .limit(1);

  return asset ?? null;
}

export async function findMediaAssetByDisplayNameInsensitive(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (!normalized) return null;

  const [asset] = await db
    .select(MEDIA_SELECT_FIELDS)
    .from(mediaAssets)
    .leftJoin(adminUsers, eq(mediaAssets.createdBy, adminUsers.id))
    .where(sql`lower(${mediaAssets.displayName}) = ${normalized}`)
    .limit(1);

  return asset ?? null;
}

export async function createMediaAsset(data: {
  displayName: string;
  originalName: string;
  storedFilename: string;
  posterStoredFilename?: string | null;
  mimeType: string;
  kind: MediaKind;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdBy: number | null;
  alias?: string | null;
  folderId?: number | null;
}) {
  const [created] = await db
    .insert(mediaAssets)
    .values({
      displayName: data.displayName,
      originalName: data.originalName,
      storedFilename: data.storedFilename,
      posterStoredFilename: data.posterStoredFilename ?? null,
      mimeType: data.mimeType,
      kind: data.kind,
      sizeBytes: data.sizeBytes,
      width: data.width,
      height: data.height,
      createdBy: data.createdBy,
      alias: data.alias ?? null,
      folderId: data.folderId ?? null,
    })
    .returning({ id: mediaAssets.id });

  return created ? getMediaAssetById(created.id) : null;
}

export async function updateMediaAssetMeta(
  id: number,
  data: {
    displayName?: string;
    alias?: string | null;
    folderId?: number | null;
    posterStoredFilename?: string | null;
  },
) {
  const updateData: {
    displayName?: string;
    alias?: string | null;
    folderId?: number | null;
    posterStoredFilename?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if ("displayName" in data && data.displayName !== undefined) {
    updateData.displayName = data.displayName;
  }
  if ("alias" in data) {
    updateData.alias = data.alias ?? null;
  }
  if ("folderId" in data) {
    updateData.folderId = data.folderId ?? null;
  }
  if ("posterStoredFilename" in data) {
    updateData.posterStoredFilename = data.posterStoredFilename ?? null;
  }

  const [updated] = await db
    .update(mediaAssets)
    .set(updateData)
    .where(eq(mediaAssets.id, id))
    .returning({ id: mediaAssets.id });

  return updated ? getMediaAssetById(updated.id) : null;
}

export async function replaceMediaAssetStorage(
  id: number,
  data: {
    alias?: string | null;
    createdBy: number | null;
    displayName: string;
    height: number | null;
    kind: MediaKind;
    mimeType: string;
    originalName: string;
    posterStoredFilename?: string | null;
    sizeBytes: number;
    storedFilename: string;
    width: number | null;
  },
) {
  const [updated] = await db
    .update(mediaAssets)
    .set({
      alias: data.alias ?? null,
      createdBy: data.createdBy,
      displayName: data.displayName,
      height: data.height,
      kind: data.kind,
      mimeType: data.mimeType,
      originalName: data.originalName,
      posterStoredFilename: data.posterStoredFilename ?? null,
      sizeBytes: data.sizeBytes,
      storedFilename: data.storedFilename,
      updatedAt: new Date(),
      width: data.width,
    })
    .where(eq(mediaAssets.id, id))
    .returning({ id: mediaAssets.id });

  return updated ? getMediaAssetById(updated.id) : null;
}

export async function listMediaAliases() {
  return db
    .select({
      alias: mediaAssets.alias,
      storedFilename: mediaAssets.storedFilename,
      posterStoredFilename: mediaAssets.posterStoredFilename,
    })
    .from(mediaAssets)
    .where(and(isNotNull(mediaAssets.alias)));
}

export async function deleteMediaAsset(id: number) {
  const [deleted] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning({
    id: mediaAssets.id,
    storedFilename: mediaAssets.storedFilename,
    folderId: mediaAssets.folderId,
  });

  return deleted ?? null;
}

export async function deleteMediaAssetByFilename(storedFilename: string) {
  const [deleted] = await db
    .delete(mediaAssets)
    .where(eq(mediaAssets.storedFilename, storedFilename))
    .returning({ id: mediaAssets.id });

  return deleted ?? null;
}
