import type { TemplateAssignment } from "@lmaa/contracts";

import { dispatchTemplateAssignments } from "./dispatch-template-assignments.js";
import type { PostContext } from "./post-context.js";
import { fetchUnsplashPhotoDetail } from "./unsplash.js";
import { processImageUpload } from "../lib/image-upload.js";
import { failure, success } from "../lib/result.js";
import {
  categoryExists,
  clearAdminCategoryImage,
  createAdminCategory,
  setAdminCategoryImage,
  setAdminCategoryUnsplashImage,
} from "../repositories/admin-categories.js";
import { updateUnsplashImageLocation, upsertUnsplashImage } from "../repositories/unsplash-images.js";

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
 * Sets an Unsplash image on a category: upserts the unsplash_images row
 * and sets the FK.
 */
export async function setManagedAdminCategoryUnsplashImage(
  id: number,
  data: {
    unsplashId: string;
    url: string;
    urlSmall: string;
    photographer: string;
    photographerUrl: string;
    downloadLocation: string;
    width: number;
    height: number;
    color: string | null;
    blurHash: string | null;
    description: string | null;
    altDescription: string | null;
    likes: number;
    createdAt: string;
  },
) {
  const exists = await categoryExists(id);
  if (!exists) return failure("not_found");

  const unsplashImage = await upsertUnsplashImage({
    unsplashId: data.unsplashId,
    urlSmall: data.urlSmall,
    urlRegular: data.url,
    width: data.width,
    height: data.height,
    color: data.color,
    blurHash: data.blurHash,
    description: data.description,
    altDescription: data.altDescription,
    likes: data.likes,
    photographerName: data.photographer,
    photographerUrl: data.photographerUrl,
    downloadLocation: data.downloadLocation,
    createdAtUnsplash: new Date(data.createdAt),
  });

  const category = await setAdminCategoryUnsplashImage(id, {
    unsplashImageId: unsplashImage.id,
    imageUrl: data.url,
    imagePhotographer: data.photographer,
    imagePhotographerUrl: data.photographerUrl,
  });

  if (!category) return failure("not_found");

  // Background location fetch
  fetchUnsplashPhotoDetail(data.unsplashId)
    .then(async (location) => {
      if (location) {
        await updateUnsplashImageLocation(unsplashImage.id, location);
      }
    })
    .catch((err: unknown) => {
      console.error(`[unsplash-location] Failed to fetch location for ${data.unsplashId}:`, err);
    });

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

/**
 * Input contract for the create-category-with-posts service.
 */
export interface CreateCategoryWithPostsInput {
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
  imageUrl?: string | null;
  imagePhotographer?: string | null;
  imagePhotographerUrl?: string | null;
  templateAssignments?: TemplateAssignment[];
  adminId: number;
}

/**
 * Creates a new category and, when assignments are supplied, fires
 * social-media posts for the new category in the background. Posts are
 * fire-and-forget; failures are logged and not surfaced to the caller.
 *
 * @param input - Validated category attributes plus admin id and optional
 *   template assignments from the create-dialog.
 * @returns The newly created category row.
 */
export async function createCategoryWithPosts(input: CreateCategoryWithPostsInput) {
  const { adminId, templateAssignments, ...data } = input;
  const category = await createAdminCategory(data);

  if (templateAssignments?.length) {
    const context: PostContext = { kind: "category", category };
    void dispatchTemplateAssignments(adminId, "category", templateAssignments, context);
  }

  return category;
}
