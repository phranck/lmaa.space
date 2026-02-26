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

export interface DeleteAdminShopData {
  mode: "delete" | "mark_deleted";
  reason: string | null;
  wasReported: boolean;
  adminId: number | null;
}

export async function getAdminShops(visibility?: ShopVisibility) {
  return listAdminShops(visibility);
}

export async function getAdminShop(id: number) {
  return getAdminShopById(id);
}

export async function createManagedAdminShop(data: CreateAdminShopData) {
  const shop = await createAdminShop(data);

  invalidateCache(SHOPS_CACHE_KEY);

  hydrateShopOgImageInBackground(shop.url, async (imageUrl) => {
    await setAdminShopOgImage(shop.id, imageUrl);
  });

  return { ...shop, categories: [] };
}

export async function updateManagedAdminShop(id: number, data: UpdateAdminShopData) {
  const shop = await updateAdminShop(id, data);
  if (!shop) {
    return null;
  }

  invalidateCache(SHOPS_CACHE_KEY);
  return { ...shop, categories: [] };
}

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

export async function changeManagedAdminShopVisibility(
  id: number,
  visibility: ShopMutableVisibility,
) {
  await setAdminShopVisibility(id, visibility);
  invalidateCache(SHOPS_CACHE_KEY);
  return { message: `Shop visibility set to ${visibility}` };
}

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

export async function previewAdminShopImage(url: string) {
  const result = await fetchShopPreviewImageFromHomepage(url);
  return { ogImage: result?.url ?? null };
}
