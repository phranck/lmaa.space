import { desc, eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { adminUsers, mediaAssets } from "../db/schema.js";

const MEDIA_SELECT_FIELDS = {
  id: mediaAssets.id,
  displayName: mediaAssets.displayName,
  originalName: mediaAssets.originalName,
  storedFilename: mediaAssets.storedFilename,
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
  mimeType: string;
  kind: "image" | "document";
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdBy: number;
}) {
  const [created] = await db
    .insert(mediaAssets)
    .values({
      displayName: data.displayName,
      originalName: data.originalName,
      storedFilename: data.storedFilename,
      mimeType: data.mimeType,
      kind: data.kind,
      sizeBytes: data.sizeBytes,
      width: data.width,
      height: data.height,
      createdBy: data.createdBy,
    })
    .returning({ id: mediaAssets.id });

  return created ? getMediaAssetById(created.id) : null;
}

export async function updateMediaAssetDisplayName(id: number, displayName: string) {
  const [updated] = await db
    .update(mediaAssets)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(mediaAssets.id, id))
    .returning({ id: mediaAssets.id });

  return updated ? getMediaAssetById(updated.id) : null;
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
