import { processImageUpload } from "../lib/image-upload.js";
import { failure, success } from "../lib/result.js";
import {
  categoryExists,
  clearAdminCategoryImage,
  setAdminCategoryImage,
} from "../repositories/admin-categories.js";

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
