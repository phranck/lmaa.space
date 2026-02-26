import sharp from "sharp";
import { detectImageType } from "../lib/validate.js";
import {
  type CreateAdminCategoryData,
  type UpdateAdminCategoryData,
  categoryExists,
  clearAdminCategoryImage,
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  setAdminCategoryImage,
  updateAdminCategory,
} from "../repositories/admin-categories.js";

const CATEGORY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export async function getAdminCategories() {
  return listAdminCategories();
}

export async function createManagedAdminCategory(data: CreateAdminCategoryData) {
  return createAdminCategory(data);
}

export async function updateManagedAdminCategory(id: number, data: UpdateAdminCategoryData) {
  return updateAdminCategory(id, data);
}

export async function deleteManagedAdminCategory(id: number) {
  await deleteAdminCategory(id);
}

export async function uploadManagedAdminCategoryImage(id: number, file: unknown) {
  const exists = await categoryExists(id);
  if (!exists) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (!(file instanceof File)) {
    return { ok: false as const, reason: "missing_file" as const };
  }

  if (file.size > CATEGORY_IMAGE_MAX_BYTES) {
    return { ok: false as const, reason: "too_large" as const };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType) {
    return { ok: false as const, reason: "invalid_image" as const };
  }

  const resized = await sharp(buffer).resize(1200, 675, { fit: "cover" }).webp().toBuffer();
  const imageUrl = `data:image/webp;base64,${resized.toString("base64")}`;
  const category = await setAdminCategoryImage(id, imageUrl);

  if (!category) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, category };
}

export async function removeManagedAdminCategoryImage(id: number) {
  const exists = await categoryExists(id);
  if (!exists) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const category = await clearAdminCategoryImage(id);
  if (!category) {
    return { ok: false as const, reason: "not_found" as const };
  }

  return { ok: true as const, category };
}
