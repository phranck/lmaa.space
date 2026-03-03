import { processImageUpload } from "../lib/image-upload.js";
import { failure, success } from "../lib/result.js";
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

/**
 * Lists categories for admin management.
 *
 * @returns Category rows with computed metadata used in dashboard.
 */
export async function getAdminCategories() {
  return listAdminCategories();
}

/**
 * Creates a new category.
 *
 * @param data - Validated category creation payload.
 * @returns Newly created category row.
 */
export async function createManagedAdminCategory(data: CreateAdminCategoryData) {
  return createAdminCategory(data);
}

/**
 * Updates an existing category.
 *
 * @param id - Category id.
 * @param data - Partial category update payload.
 * @returns Updated category row or `null`.
 */
export async function updateManagedAdminCategory(id: number, data: UpdateAdminCategoryData) {
  return updateAdminCategory(id, data);
}

/**
 * Deletes a category by id.
 *
 * @param id - Category id.
 * @returns Resolves when deletion completes.
 */
export async function deleteManagedAdminCategory(id: number) {
  await deleteAdminCategory(id);
}

/**
 * Uploads and normalizes a category hero image.
 *
 * @param id - Category id.
 * @param file - Multipart file payload from request layer.
 * @returns Result union with `ok` flag and optional reason/category payload.
 *
 * @remarks
 * Side effects:
 * - Validates file presence, size and magic bytes.
 * - Resizes image to `1200x675` WebP.
 * - Persists image as data URL.
 */
export async function uploadManagedAdminCategoryImage(id: number, file: unknown) {
  const exists = await categoryExists(id);
  if (!exists) {
    return failure("not_found");
  }

  const result = await processImageUpload(file, 1200, 675);
  if (!result.ok) {
    return result;
  }

  const category = await setAdminCategoryImage(id, result.dataUrl);

  if (!category) {
    return failure("not_found");
  }

  return success({ category });
}

/**
 * Removes the category hero image.
 *
 * @param id - Category id.
 * @returns Result union with `ok` flag and optional reason/category payload.
 */
export async function removeManagedAdminCategoryImage(id: number) {
  const exists = await categoryExists(id);
  if (!exists) {
    return failure("not_found");
  }

  const category = await clearAdminCategoryImage(id);
  if (!category) {
    return failure("not_found");
  }

  return success({ category });
}
