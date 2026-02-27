import type { ShopMutableVisibility, ShopVisibility } from "@lmaa/shared";
import { invalidateCache } from "../middleware/cache.js";
import {
  type CreateAdminShopData,
  type UpdateAdminShopData,
  createAdminShop,
  getAdminShopById,
  getAdminShopUrl,
  listAdminShops,
  markAdminShopDeleted,
  permanentlyDeleteAdminShop,
  setAdminShopOgImage,
  setAdminShopVisibility,
  shopExists,
  updateAdminShop,
} from "../repositories/admin-shops.js";
import {
  fetchShopPreviewImageFromHomepage,
  hydrateShopOgImageInBackground,
} from "./preview-images.js";

const SHOPS_CACHE_KEY = "shops:all";

/**
 * Delete operation payload for admin shop removal workflow.
 */
export interface DeleteAdminShopData {
  mode: "delete" | "mark_deleted";
  reason: string | null;
  wasReported: boolean;
  adminId: number | null;
}

/**
 * Lists shops for admin dashboard with optional visibility filter.
 *
 * @param visibility - Optional visibility filter (`public`/`onhold`/`deleted`).
 * @returns Shop list with mapped categories.
 */
export async function getAdminShops(visibility?: ShopVisibility) {
  return listAdminShops(visibility);
}

/**
 * Returns one admin shop by id.
 *
 * @param id - Shop id.
 * @returns Shop payload or `null`.
 */
export async function getAdminShop(id: number) {
  return getAdminShopById(id);
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
    return null;
  }

  invalidateCache(SHOPS_CACHE_KEY);
  return { ...shop, categories: [] };
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
  const exists = await shopExists(id);
  if (!exists) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (data.mode === "delete") {
    await permanentlyDeleteAdminShop(id);
  } else {
    await markAdminShopDeleted(id, data.adminId, data.reason, data.wasReported);
  }

  invalidateCache(SHOPS_CACHE_KEY);

  return {
    ok: true as const,
    message: data.mode === "delete" ? "Shop permanently deleted" : "Shop marked deleted",
  };
}

/**
 * Updates mutable visibility state for a shop.
 *
 * @param id - Shop id.
 * @param visibility - Target visibility (`public` or `onhold`).
 * @returns Confirmation message payload.
 */
export async function changeManagedAdminShopVisibility(
  id: number,
  visibility: ShopMutableVisibility,
) {
  await setAdminShopVisibility(id, visibility);
  invalidateCache(SHOPS_CACHE_KEY);
  return { message: `Shop visibility set to ${visibility}` };
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
    return { ok: false as const, reason: "not_found" as const };
  }

  const result = await fetchShopPreviewImageFromHomepage(url);
  const ogImage = result?.url ?? null;
  await setAdminShopOgImage(id, ogImage);

  return { ok: true as const, ogImage };
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
