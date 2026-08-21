import type { ShopMutableVisibility } from "@lmaa/shared";

import {
  fetchShopPreviewImageFromHomepage,
  hydrateShopOgImageInBackground,
} from "./preview-images.js";
import { validateShopUrl } from "./public.js";
import { db } from "../db/client.js";
import { categories } from "../db/schema.js";
import { failure, success } from "../lib/result.js";
import { mapShopJsonToShopData } from "../lib/shopjson-mapper.js";
import {
  type CreateAdminShopData,
  type UpdateAdminShopData,
  createAdminShop,
  getAdminShopById,
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
 * Blocks creation when a shop or submission for the same registered domain
 * already exists to prevent duplicate entries (e.g. `example.de` vs
 * `www.example.de`).
 *
 * @param data - Validated create payload.
 * @returns
 * - `{ ok: true, shop }` when the shop was inserted.
 * - `{ ok: false, reason: "domain_conflict", conflictStatus, conflictShopName }`
 *   when another shop or submission already claims the same registered domain.
 *   `conflictStatus` mirrors the `validateShopUrl` status (`"published"`,
 *   `"rejected"`, `"pending"`, `"blocked"` or `"invalid"`).
 *
 * @remarks
 * Side effects on success:
 * - Starts fire-and-forget OG image hydration and persistence.
 */
export async function createManagedAdminShop(data: CreateAdminShopData) {
  const urlCheck = await validateShopUrl(data.url);
  if (urlCheck.status !== "available") {
    return {
      ok: false as const,
      reason: "domain_conflict" as const,
      conflictStatus: urlCheck.status,
      conflictShopName: "shopName" in urlCheck ? urlCheck.shopName : undefined,
    };
  }

  const shop = await createAdminShop(data);

  hydrateShopOgImageInBackground(shop.url, async (imageUrl) => {
    await setAdminShopOgImage(shop.id, imageUrl);
  });

  return success({ shop: { ...shop, categories: [] } });
}

/**
 * Updates an existing shop.
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
  options?: {
    rejectionToken?: string | null;
    rejectionAdminNote?: string | null;
    rejectionLongText?: string | null;
  },
) {
  const found = await setAdminShopVisibility(id, visibility, options);
  if (!found) {
    return failure("not_found");
  }

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

  return success();
}

/**
 * Stages raw shop review JSON without touching live fields.
 *
 * @param id - Shop id.
 * @param rawShopJson - Raw shop JSON to stage.
 * @returns Update result.
 */
export async function stageShopReviewData(id: number, rawShopJson: Record<string, unknown>) {
  const shop = await updateAdminShop(id, { reviewData: rawShopJson, needsReview: true });
  if (!shop) return failure("not_found");

  return success({ shop });
}

/**
 * Applies staged reviewData to live shop fields and clears the staging area.
 *
 * @param id - Shop id.
 * @returns Updated shop or failure reason.
 */
export async function acceptShopReview(id: number) {
  const shop = await getAdminShopById(id);
  if (!shop) return failure("not_found" as const);
  if (!shop.reviewData) return failure("no_review_data" as const);

  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories);
  const categoryNameToId = new Map(
    allCategories.map((cat) => [cat.name.trim().toLocaleLowerCase("de-DE"), cat.id] as const),
  );

  const mapped = mapShopJsonToShopData(shop.reviewData, categoryNameToId);
  const updated = await updateAdminShop(id, {
    ...mapped,
    needsReview: false,
    reviewData: null,
  });
  if (!updated) return failure("not_found" as const);

  return success({ shop: { ...updated, categories: [] } });
}
