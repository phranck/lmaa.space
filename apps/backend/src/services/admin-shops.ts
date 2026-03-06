import type { ShopMutableVisibility } from "@lmaa/shared";

import {
  fetchShopPreviewImageFromHomepage,
  hydrateShopOgImageInBackground,
} from "./preview-images.js";
import { failure, success } from "../lib/result.js";
import { SHOPS_CACHE_KEY, invalidateCache } from "../middleware/cache.js";
import {
  type CreateAdminShopData,
  type UpdateAdminShopData,
  createAdminShop,
  getAdminShopUrl,
  markAdminShopDeleted,
  permanentlyDeleteAdminShop,
  setAdminShopOgImage,
  setAdminShopVisibility,
  updateAdminShop,
  updateAdminShopDeleteReason,
} from "../repositories/admin-shops.js";

/**
 * Delete operation payload for admin shop removal workflow.
 */
interface DeleteAdminShopData {
  mode: "delete" | "mark_deleted";
  reason: string | null;
  wasReported: boolean;
  adminId: number | null;
}

/**
 * Creates a new shop from admin UI and schedules OG image hydration.
 *
 * @param data - Validated create payload.
 * @returns Newly created shop payload with empty `categories` placeholder.
 *
 * @remarks
 * Side effects:
 * - Invalidates shared public shop cache key.
 * - Starts fire-and-forget OG image hydration and persistence.
 */
export async function createManagedAdminShop(data: CreateAdminShopData) {
  const shop = await createAdminShop(data);

  invalidateCache(SHOPS_CACHE_KEY);

  hydrateShopOgImageInBackground(shop.url, async (imageUrl) => {
    await setAdminShopOgImage(shop.id, imageUrl);
  });

  return { ...shop, categories: [] };
}

/**
 * Updates an existing shop and invalidates public cache.
 *
 * @param id - Shop id.
 * @param data - Partial update payload.
 * @returns Updated shop payload or `null` when shop does not exist.
 */
export async function updateManagedAdminShop(id: number, data: UpdateAdminShopData) {
  const shop = await updateAdminShop(id, data);
  if (!shop) {
    return failure("not_found");
  }

  invalidateCache(SHOPS_CACHE_KEY);
  return success({ shop: { ...shop, categories: [] } });
}

/**
 * Deletes a shop permanently or marks it as deleted.
 *
 * @param id - Shop id.
 * @param data - Deletion mode and metadata.
 * @returns Operation result object.
 *
 * @remarks
 * Side effects:
 * - `mode: "delete"` removes rows permanently.
 * - `mode: "mark_deleted"` keeps row and stores moderation metadata.
 * - Always invalidates shared public shop cache key.
 */
export async function deleteManagedAdminShop(id: number, data: DeleteAdminShopData) {
  let found: boolean;

  if (data.mode === "delete") {
    found = await permanentlyDeleteAdminShop(id);
  } else {
    found = await markAdminShopDeleted(id, data.adminId, data.reason, data.wasReported);
  }

  if (!found) {
    return failure("not_found");
  }

  invalidateCache(SHOPS_CACHE_KEY);

  return success({
    message: data.mode === "delete" ? "Shop permanently deleted" : "Shop marked deleted",
  });
}

/**
 * Updates mutable visibility state for a shop.
 *
 * @param id - Shop id.
 * @param visibility - Target visibility.
 * @param options - Optional rejection payload passed through when visibility is `"rejected"`.
 * @returns Confirmation message payload.
 */
export async function changeManagedAdminShopVisibility(
  id: number,
  visibility: ShopMutableVisibility,
  options?: { rejectionToken?: string | null; rejectionLongText?: string | null },
) {
  const found = await setAdminShopVisibility(id, visibility, options);
  if (!found) {
    return failure("not_found");
  }

  invalidateCache(SHOPS_CACHE_KEY);
  return success({ message: `Shop visibility set to ${visibility}` });
}

/**
 * Re-fetches and persists OG image for an existing shop.
 *
 * @param id - Shop id.
 * @returns
 * - `{ ok: false, reason: "not_found" }` if shop is missing.
 * - `{ ok: true, ogImage }` with persisted image URL or `null`.
 */
export async function refetchAdminShopImage(id: number) {
  const url = await getAdminShopUrl(id);
  if (!url) {
    return failure("not_found");
  }

  const result = await fetchShopPreviewImageFromHomepage(url);
  const ogImage = result?.url ?? null;
  await setAdminShopOgImage(id, ogImage);

  return success({ ogImage });
}

export async function setManagedAdminShopOgImage(id: number, ogImage: string | null) {
  await setAdminShopOgImage(id, ogImage);
  invalidateCache(SHOPS_CACHE_KEY);
  return success();
}

/**
 * Resolves OG preview image for an arbitrary URL without persistence.
 *
 * @param url - Arbitrary external URL.
 * @returns Preview image URL or `null`.
 */
export async function previewAdminShopImage(url: string) {
  const result = await fetchShopPreviewImageFromHomepage(url);
  return { ogImage: result?.url ?? null };
}

/**
 * Updates the delete reason for a soft-deleted shop.
 *
 * @param id - Shop id.
 * @param reason - New reason text or `null` to clear.
 * @returns `{ ok: true }` or `{ ok: false }` if the shop does not exist.
 */
export async function updateManagedAdminShopDeleteReason(id: number, reason: string | null) {
  const found = await updateAdminShopDeleteReason(id, reason);
  if (!found) return failure("not_found");
  invalidateCache(SHOPS_CACHE_KEY);
  return success();
}
