import { asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { FolderContentsResponse, MediaFolder } from "@lmaa/shared";

import { listManagedMediaAssetsByFolder } from "./admin-media.js";
import { db } from "../db/client.js";
import { mediaAssets, mediaFolders } from "../db/schema.js";
import { removeStoredMediaAsset } from "../lib/media-storage.js";

type MediaFolderRow = typeof mediaFolders.$inferSelect;

const SOCIAL_MEDIA_FOLDER_SYSTEM_KEY = "social-media";
const SOCIAL_MEDIA_FOLDER_NAME = "Social Media";

function serializeFolder(row: MediaFolderRow): MediaFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    color: row.color ?? null,
    itemCount: 0,
    sizeBytes: 0,
    systemKey: row.systemKey ?? null,
    isSystem: row.isSystem,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
  };
}

function withFolderStats(folder: MediaFolder, itemCount: number, sizeBytes: number): MediaFolder {
  return { ...folder, itemCount, sizeBytes };
}

export interface CreateFolderInput {
  name: string;
  parentId: number | null;
  assetIds?: number[];
  createdBy: number | null;
}

export async function ensureSocialMediaFolder(): Promise<MediaFolder> {
  const existing = await getFolderBySystemKey(SOCIAL_MEDIA_FOLDER_SYSTEM_KEY);
  if (existing) return existing;

  const [inserted] = await db
    .insert(mediaFolders)
    .values({
      name: SOCIAL_MEDIA_FOLDER_NAME,
      parentId: null,
      color: "purple",
      systemKey: SOCIAL_MEDIA_FOLDER_SYSTEM_KEY,
      isSystem: true,
      createdBy: null,
    })
    .onConflictDoUpdate({
      target: mediaFolders.systemKey,
      set: {
        name: SOCIAL_MEDIA_FOLDER_NAME,
        isSystem: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!inserted) throw new Error("create_failed");
  return serializeFolder(inserted);
}

export async function createFolder(input: CreateFolderInput): Promise<MediaFolder> {
  return db.transaction(async (tx) => {
    if (input.parentId !== null) {
      const parent = await tx
        .select({ id: mediaFolders.id })
        .from(mediaFolders)
        .where(eq(mediaFolders.id, input.parentId))
        .limit(1);
      if (parent.length === 0) {
        throw new Error("parent_not_found");
      }
    }

    const [inserted] = await tx
      .insert(mediaFolders)
      .values({
        name: input.name,
        parentId: input.parentId,
        createdBy: input.createdBy,
      })
      .returning();

    if (!inserted) throw new Error("create_failed");

    if (input.assetIds && input.assetIds.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ folderId: inserted.id, updatedAt: new Date() })
        .where(inArray(mediaAssets.id, input.assetIds));
    }

    return serializeFolder(inserted);
  });
}

export interface UpdateFolderInput {
  id: number;
  name?: string;
  parentId?: number | null;
  color?: MediaFolder["color"];
}

export async function updateFolder(input: UpdateFolderInput): Promise<MediaFolder | null> {
  const current = await getFolderById(input.id);
  if (!current) return null;
  if (current.isSystem && (input.name !== undefined || input.parentId !== undefined)) {
    throw new Error("system_folder_locked");
  }

  if (input.parentId !== undefined && input.parentId !== null && input.parentId === input.id) {
    throw new Error("self_parent");
  }

  if (input.parentId !== undefined && input.parentId !== null) {
    const wouldCreateCycle = await isDescendant(input.id, input.parentId);
    if (wouldCreateCycle) {
      throw new Error("parent_is_descendant");
    }
  }

  const updates: Partial<typeof mediaFolders.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.parentId !== undefined) updates.parentId = input.parentId;
  if (input.color !== undefined) updates.color = input.color;

  const [updated] = await db
    .update(mediaFolders)
    .set(updates)
    .where(eq(mediaFolders.id, input.id))
    .returning();

  return updated ? serializeFolder(updated) : null;
}

async function getFolderById(id: number): Promise<MediaFolder | null> {
  const [row] = await db.select().from(mediaFolders).where(eq(mediaFolders.id, id)).limit(1);
  return row ? serializeFolder(row) : null;
}

async function getFolderBySystemKey(systemKey: string): Promise<MediaFolder | null> {
  const [row] = await db
    .select()
    .from(mediaFolders)
    .where(eq(mediaFolders.systemKey, systemKey))
    .limit(1);
  return row ? serializeFolder(row) : null;
}

async function listChildFolders(parentId: number | null): Promise<MediaFolder[]> {
  const rows = await db
    .select()
    .from(mediaFolders)
    .where(parentId === null ? isNull(mediaFolders.parentId) : eq(mediaFolders.parentId, parentId))
    .orderBy(asc(sql`lower(${mediaFolders.name})`));
  const folders = rows.map(serializeFolder);
  if (folders.length === 0) return folders;

  const folderIds = folders.map((folder) => folder.id);
  const [folderCounts, assetCounts, recursiveAssetSizes] = await Promise.all([
    db
      .select({
        parentId: mediaFolders.parentId,
        count: sql<number>`count(*)::int`,
      })
      .from(mediaFolders)
      .where(inArray(mediaFolders.parentId, folderIds))
      .groupBy(mediaFolders.parentId),
    db
      .select({
        folderId: mediaAssets.folderId,
        count: sql<number>`count(*)::int`,
      })
      .from(mediaAssets)
      .where(inArray(mediaAssets.folderId, folderIds))
      .groupBy(mediaAssets.folderId),
    assetSizesByFolderTree(folderIds),
  ]);

  const itemCounts = new Map<number, number>();
  for (const item of folderCounts) {
    if (item.parentId !== null) itemCounts.set(item.parentId, Number(item.count));
  }
  for (const item of assetCounts) {
    if (item.folderId !== null) {
      itemCounts.set(item.folderId, (itemCounts.get(item.folderId) ?? 0) + Number(item.count));
    }
  }

  return folders.map((folder) =>
    withFolderStats(
      folder,
      itemCounts.get(folder.id) ?? 0,
      recursiveAssetSizes.get(folder.id) ?? 0,
    ),
  );
}

interface FolderAssetSizeRow extends Record<string, unknown> {
  root_id: number;
  size_bytes: number | string | null;
}

async function assetSizesByFolderTree(folderIds: number[]): Promise<Map<number, number>> {
  if (folderIds.length === 0) return new Map();

  const result = await db.execute<FolderAssetSizeRow>(sql`
    WITH RECURSIVE descendants(root_id, folder_id) AS (
      SELECT id AS root_id, id AS folder_id
      FROM media_folders
      WHERE id IN (${sql.join(folderIds, sql`, `)})
      UNION ALL
      SELECT d.root_id, f.id AS folder_id
      FROM descendants d
      JOIN media_folders f ON f.parent_id = d.folder_id
    )
    SELECT d.root_id, COALESCE(SUM(a.size_bytes), 0)::bigint AS size_bytes
    FROM descendants d
    LEFT JOIN media_assets a ON a.folder_id = d.folder_id
    GROUP BY d.root_id
  `);
  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: FolderAssetSizeRow[] }).rows ?? [])
  ) as FolderAssetSizeRow[];

  return new Map(rows.map((row) => [row.root_id, Number(row.size_bytes ?? 0)]));
}

interface DescendantIdRow extends Record<string, unknown> {
  id: number;
}

async function isDescendant(candidateAncestorId: number, descendantId: number): Promise<boolean> {
  if (candidateAncestorId === descendantId) return true;
  const result = await db.execute<DescendantIdRow>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM media_folders WHERE id = ${candidateAncestorId}
      UNION ALL
      SELECT f.id FROM media_folders f JOIN descendants d ON f.parent_id = d.id
    )
    SELECT id FROM descendants WHERE id = ${descendantId} LIMIT 1
  `);
  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: DescendantIdRow[] }).rows ?? [])
  ) as DescendantIdRow[];
  return rows.length > 0;
}

interface RecursiveFolderRow extends Record<string, unknown> {
  id: number;
  name: string;
  parent_id: number | null;
  color: MediaFolder["color"];
  system_key: string | null;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number | null;
}

function rowFromExecuteResult(row: RecursiveFolderRow): MediaFolder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    color: row.color,
    itemCount: 0,
    sizeBytes: 0,
    systemKey: row.system_key,
    isSystem: row.is_system,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    createdBy: row.created_by,
  };
}

async function listAncestors(folderId: number): Promise<MediaFolder[]> {
  const result = await db.execute<RecursiveFolderRow>(sql`
    WITH RECURSIVE chain AS (
      SELECT f.*, 0 AS depth
      FROM media_folders f
      WHERE f.id = ${folderId}
      UNION ALL
      SELECT f.*, c.depth + 1
      FROM media_folders f
      JOIN chain c ON f.id = c.parent_id
    )
    SELECT id, name, parent_id, color, system_key, is_system, created_at, updated_at, created_by
    FROM chain
    WHERE id <> ${folderId}
    ORDER BY depth DESC
  `);

  const rows = (
    Array.isArray(result) ? result : ((result as { rows?: RecursiveFolderRow[] }).rows ?? [])
  ) as RecursiveFolderRow[];
  return rows.map(rowFromExecuteResult);
}

export interface DeleteFolderResult {
  deletedFolderCount: number;
  deletedAssetCount: number;
}

export async function deleteFolderCascade(folderId: number): Promise<DeleteFolderResult> {
  const folder = await getFolderById(folderId);
  if (!folder) throw new Error("not_found");
  if (folder.isSystem) throw new Error("system_folder_locked");

  const captured = await db.transaction(async (tx) => {
    const descendantsResult = await tx.execute<DescendantIdRow>(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM media_folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id FROM media_folders f JOIN descendants d ON f.parent_id = d.id
      )
      SELECT id FROM descendants
    `);
    const descendantIds = (
      Array.isArray(descendantsResult)
        ? descendantsResult
        : ((descendantsResult as { rows?: DescendantIdRow[] }).rows ?? [])
    ).map((r) => r.id as number);

    const assets =
      descendantIds.length === 0
        ? []
        : await tx
            .select({ id: mediaAssets.id, storedFilename: mediaAssets.storedFilename })
            .from(mediaAssets)
            .where(inArray(mediaAssets.folderId, descendantIds));

    await tx.delete(mediaFolders).where(eq(mediaFolders.id, folderId));

    return {
      assets,
      folderCount: descendantIds.length,
    };
  });

  await Promise.all(
    captured.assets.map(async (asset) => {
      try {
        await removeStoredMediaAsset(asset.storedFilename);
      } catch (error) {
        console.error("media storage cleanup failed", { assetId: asset.id, error });
      }
    }),
  );

  return {
    deletedFolderCount: captured.folderCount,
    deletedAssetCount: captured.assets.length,
  };
}

export async function getFolderContents(folderId: number | null): Promise<FolderContentsResponse> {
  await ensureSocialMediaFolder();

  const [folder, ancestors, folders, assets] = await Promise.all([
    folderId === null ? Promise.resolve(null) : getFolderById(folderId),
    folderId === null ? Promise.resolve<MediaFolder[]>([]) : listAncestors(folderId),
    listChildFolders(folderId),
    listManagedMediaAssetsByFolder(folderId),
  ]);

  return { folder, ancestors, folders, assets };
}
