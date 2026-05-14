import { and, desc, eq, isNotNull } from "drizzle-orm";

import type { MediaKind } from "@lmaa/shared";

import { db } from "../db/index.js";
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

export async function getMediaAssetById(id: number) {
  const [asset] = await db
    .select(MEDIA_SELECT_FIELDS)
    .from(mediaAssets)
    .leftJoin(adminUsers, eq(mediaAssets.createdBy, adminUsers.id))
    .where(eq(mediaAssets.id, id))
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
    })
    .returning({ id: mediaAssets.id });

  return created ? getMediaAssetById(created.id) : null;
}

export async function updateMediaAssetMeta(
  id: number,
  data: { displayName: string; alias?: string | null; posterStoredFilename?: string | null },
) {
  const updateData: {
    displayName: string;
    alias: string | null;
    posterStoredFilename?: string | null;
    updatedAt: Date;
  } = {
    displayName: data.displayName,
    alias: data.alias ?? null,
    updatedAt: new Date(),
  };

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

export async function listMediaAliases() {
  return db
    .select({ alias: mediaAssets.alias, storedFilename: mediaAssets.storedFilename })
    .from(mediaAssets)
    .where(and(isNotNull(mediaAssets.alias)));
}

export async function deleteMediaAsset(id: number) {
  const [deleted] = await db
    .delete(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .returning({
      id: mediaAssets.id,
      storedFilename: mediaAssets.storedFilename,
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
