import { desc, eq } from "drizzle-orm";

import type { SocialPreviewComposition, SocialPreviewFormat } from "@lmaa/contracts";

import { db } from "../db/client.js";
import { adminUsers, socialPreviewImages, socialPreviewProjects } from "../db/schema.js";

const SOCIAL_PREVIEW_PROJECT_SELECT_FIELDS = {
  id: socialPreviewProjects.id,
  name: socialPreviewProjects.name,
  composition: socialPreviewProjects.composition,
  createdAt: socialPreviewProjects.createdAt,
  updatedAt: socialPreviewProjects.updatedAt,
  createdByUsername: adminUsers.username,
};

const SOCIAL_PREVIEW_SELECT_FIELDS = {
  id: socialPreviewImages.id,
  name: socialPreviewImages.name,
  imageUrl: socialPreviewImages.imageUrl,
  mediaAssetId: socialPreviewImages.mediaAssetId,
  composition: socialPreviewImages.composition,
  width: socialPreviewImages.width,
  height: socialPreviewImages.height,
  format: socialPreviewImages.format,
  quality: socialPreviewImages.quality,
  sizeBytes: socialPreviewImages.sizeBytes,
  createdAt: socialPreviewImages.createdAt,
  updatedAt: socialPreviewImages.updatedAt,
  createdByUsername: adminUsers.username,
};

export interface SocialPreviewProjectCreateData {
  name: string;
  composition: SocialPreviewComposition;
  createdBy: number | null;
}

export interface SocialPreviewProjectUpdateData {
  name?: string;
  composition?: SocialPreviewComposition;
}

export interface SocialPreviewImageCreateData {
  name: string;
  imageUrl: string;
  mediaAssetId?: number | null;
  composition: SocialPreviewComposition;
  width: number;
  height: number;
  format: SocialPreviewFormat;
  quality: number;
  sizeBytes: number;
  createdBy: number | null;
}

export async function listSocialPreviewProjects() {
  return db
    .select(SOCIAL_PREVIEW_PROJECT_SELECT_FIELDS)
    .from(socialPreviewProjects)
    .leftJoin(adminUsers, eq(socialPreviewProjects.createdBy, adminUsers.id))
    .orderBy(desc(socialPreviewProjects.updatedAt), desc(socialPreviewProjects.id));
}

export async function getSocialPreviewProjectById(id: number) {
  const [row] = await db
    .select(SOCIAL_PREVIEW_PROJECT_SELECT_FIELDS)
    .from(socialPreviewProjects)
    .leftJoin(adminUsers, eq(socialPreviewProjects.createdBy, adminUsers.id))
    .where(eq(socialPreviewProjects.id, id))
    .limit(1);

  return row ?? null;
}

export async function createSocialPreviewProject(data: SocialPreviewProjectCreateData) {
  const [created] = await db
    .insert(socialPreviewProjects)
    .values({
      name: data.name,
      composition: data.composition,
      createdBy: data.createdBy,
    })
    .returning({ id: socialPreviewProjects.id });

  return created ? getSocialPreviewProjectById(created.id) : null;
}

export async function updateSocialPreviewProject(id: number, data: SocialPreviewProjectUpdateData) {
  const [updated] = await db
    .update(socialPreviewProjects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialPreviewProjects.id, id))
    .returning({ id: socialPreviewProjects.id });

  return updated ? getSocialPreviewProjectById(updated.id) : null;
}

export async function deleteSocialPreviewProject(id: number) {
  const [deleted] = await db
    .delete(socialPreviewProjects)
    .where(eq(socialPreviewProjects.id, id))
    .returning({ id: socialPreviewProjects.id });

  return deleted ?? null;
}

export async function listSocialPreviewImages() {
  return db
    .select(SOCIAL_PREVIEW_SELECT_FIELDS)
    .from(socialPreviewImages)
    .leftJoin(adminUsers, eq(socialPreviewImages.createdBy, adminUsers.id))
    .orderBy(desc(socialPreviewImages.createdAt), desc(socialPreviewImages.id));
}

export async function getSocialPreviewImageById(id: number) {
  const [row] = await db
    .select(SOCIAL_PREVIEW_SELECT_FIELDS)
    .from(socialPreviewImages)
    .leftJoin(adminUsers, eq(socialPreviewImages.createdBy, adminUsers.id))
    .where(eq(socialPreviewImages.id, id))
    .limit(1);

  return row ?? null;
}

export async function createSocialPreviewImage(data: SocialPreviewImageCreateData) {
  const [created] = await db
    .insert(socialPreviewImages)
    .values({
      name: data.name,
      imageUrl: data.imageUrl,
      mediaAssetId: data.mediaAssetId ?? null,
      composition: data.composition,
      width: data.width,
      height: data.height,
      format: data.format,
      quality: data.quality,
      sizeBytes: data.sizeBytes,
      createdBy: data.createdBy,
    })
    .returning({ id: socialPreviewImages.id });

  return created ? getSocialPreviewImageById(created.id) : null;
}

export async function deleteSocialPreviewImage(id: number) {
  const [deleted] = await db
    .delete(socialPreviewImages)
    .where(eq(socialPreviewImages.id, id))
    .returning({ id: socialPreviewImages.id });

  return deleted ?? null;
}
