import { eq, sql } from "drizzle-orm";

import type {
  AdminShopListItem,
  Shop as SharedShop,
  ShopCheckNotes,
  ShopMutableVisibility,
  ShopVisibility,
} from "@lmaa/shared";

import type { HeadquartersInput } from "./headquarters.js";
import { loadShopHeadquartersMap, upsertShopHeadquarters } from "./headquarters.js";
import { db } from "../db/index.js";
import { adminUsers, deadLinkReports, shopCategories, shops } from "../db/schema.js";
import type { Shop as DbShop } from "../db/schema.js";

/**
 * Payload used when creating a shop from dashboard.
 */
export interface CreateAdminShopData {
  name: string;
  url: string;
  categoryIds: number[];
  region: string[];
  pickup?: string;
  shipping?: string;
  description?: string;
  contactEmail?: string;
  shopCheckNotes?: ShopCheckNotes | null;
  headquarters?: HeadquartersInput | null;
  socialMedia?: Record<string, string>;
}

/**
 * Partial patch payload for admin shop updates.
 */
export interface UpdateAdminShopData {
  name?: string;
  url?: string;
  categoryIds?: number[];
  region?: string[];
  pickup?: string;
  shipping?: string;
  description?: string;
  contactEmail?: string;
  shopCheckNotes?: ShopCheckNotes | null;
  headquarters?: HeadquartersInput | null;
  socialMedia?: Record<string, string>;
  needsReview?: boolean;
  reviewData?: Record<string, unknown> | null;
}

/**
 * Lists all shops with categories and deletion metadata.
 *
 * @param visibility - Optional visibility filter.
 * @returns Shop summaries sorted by name.
 */
export async function listAdminShops(visibility?: ShopVisibility): Promise<AdminShopListItem[]> {
  const rows = await db.execute<AdminShopListItem & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region,
           s.description,
           s.shipping,
           s.like_count as "likeCount",
           s.contact_email as "contactEmail",
           s.shop_check_notes as "shopCheckNotes",
           s.social_media as "socialMedia",
           s.og_image as "ogImage",
           s.visibility,
           s.delete_reason as "deleteReason",
           s.deleted_was_reported as "deletedWasReported",
           s.updated_at as "deletedAt",
           u.username as "deletedByUsername",
           u.first_name as "deletedByFirstName",
           u.last_name as "deletedByLastName",
           s.rejection_token as "rejectionToken",
           s.rejection_admin_note as "rejectionAdminNote",
           s.rejection_long_text as "rejectionLongText",
           s.needs_review as "needsReview",
           s.review_data as "reviewData",
           CASE WHEN sr.id IS NOT NULL THEN json_build_object(
             'remindAt', sr.remind_at,
             'note', sr.note,
             'isActive', sr.is_active
           ) ELSE NULL END as reminder,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN admin_users u ON u.id = s.deleted_by
    LEFT JOIN shop_reminders sr ON sr.shop_id = s.id
    ${visibility ? sql`WHERE s.visibility = ${visibility}` : sql``}
    GROUP BY s.id, u.username, u.first_name, u.last_name, sr.id, sr.remind_at, sr.note, sr.is_active
    ORDER BY s.name
  `);

  const headquartersByShopId = await loadShopHeadquartersMap(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    headquarters: headquartersByShopId.get(row.id) ?? null,
  }));
}

/**
 * Loads a shop including category assignments.
 *
 * @param id - Shop id.
 * @returns Shop detail or `null` when missing.
 */
export async function getAdminShopById(id: number): Promise<SharedShop | null> {
  const [shop] = await db.execute<SharedShop & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.contact_email as "contactEmail",
           s.shop_check_notes as "shopCheckNotes",
           s.like_count as "likeCount",
           s.is_active as "isActive", s.visibility,
           s.rejection_token as "rejectionToken",
           s.rejection_admin_note as "rejectionAdminNote",
           s.rejection_long_text as "rejectionLongText",
           s.needs_review as "needsReview",
           s.review_data as "reviewData",
           s.social_media as "socialMedia",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.id = ${id}
    GROUP BY s.id
  `);

  if (!shop) {
    return null;
  }

  const headquartersByShopId = await loadShopHeadquartersMap([id]);
  return {
    ...shop,
    headquarters: headquartersByShopId.get(id) ?? null,
  };
}

/**
 * Creates a shop and all category links in a single transaction.
 *
 * @param data - Validated shop payload.
 * @returns Inserted raw DB shop row.
 */
export async function createAdminShop(data: CreateAdminShopData): Promise<DbShop> {
  return db.transaction(async (tx) => {
    const { categoryIds, contactEmail, headquarters, ...shopData } = data;
    const [shop] = await tx
      .insert(shops)
      .values({
        ...shopData,
        contactEmail: contactEmail || null,
      })
      .returning();

    if (categoryIds.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryIds.map((categoryId) => ({ shopId: shop.id, categoryId })));
    }

    await upsertShopHeadquarters(tx, shop.id, headquarters);

    return shop;
  });
}

/**
 * Updates one shop and optionally replaces category links.
 *
 * Hidden behavior: when `categoryIds` is present, all previous links are
 * removed before new links are inserted.
 *
 * @param id - Shop id.
 * @param data - Partial update payload.
 * @returns Updated shop row or `null` if not found.
 */
export async function updateAdminShop(
  id: number,
  data: UpdateAdminShopData,
): Promise<DbShop | null> {
  return db.transaction(async (tx) => {
    const {
      categoryIds,
      contactEmail,
      headquarters,
      needsReview,
      reviewData,
      shopCheckNotes,
      ...shopData
    } = data;

    const [shop] = await tx
      .update(shops)
      .set({
        ...shopData,
        contactEmail: contactEmail || null,
        ...(shopCheckNotes !== undefined ? { shopCheckNotes } : {}),
        ...(needsReview !== undefined ? { needsReview } : {}),
        ...(reviewData !== undefined ? { reviewData } : {}),
        updatedAt: new Date(),
      })
      .where(eq(shops.id, id))
      .returning();

    if (!shop) {
      return null;
    }

    if (categoryIds !== undefined) {
      await tx.delete(shopCategories).where(eq(shopCategories.shopId, id));

      if (categoryIds.length > 0) {
        await tx
          .insert(shopCategories)
          .values(categoryIds.map((categoryId) => ({ shopId: id, categoryId })));
      }
    }

    if (headquarters !== undefined) {
      await upsertShopHeadquarters(tx, id, headquarters);
    }

    return shop;
  });
}

/**
 * Returns shop counts grouped by visibility.
 *
 * @returns Record mapping each visibility to its count plus a total.
 */
export async function getShopVisibilityCounts(): Promise<Record<ShopVisibility | "all", number>> {
  const rows = await db.execute<
    { visibility: ShopVisibility; count: number } & Record<string, unknown>
  >(sql`
    SELECT visibility, count(*)::int AS count
    FROM shops
    GROUP BY visibility
  `);

  const counts: Record<string, number> = { all: 0, public: 0, onhold: 0, deleted: 0, rejected: 0 };
  for (const row of rows) {
    counts[row.visibility] = row.count;
    counts.all += row.count;
  }
  return counts as Record<ShopVisibility | "all", number>;
}

/**
 * Checks whether a shop exists.
 *
 * @param id - Shop id.
 * @returns `true` if a row is present.
 */
export async function shopExists(id: number): Promise<boolean> {
  const [row] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id)).limit(1);
  return Boolean(row);
}

/**
 * Permanently deletes a shop and its dependent dead-link reports.
 *
 * @param id - Shop id.
 * @returns Resolves when transaction has completed.
 */
export async function permanentlyDeleteAdminShop(id: number): Promise<boolean> {
  const [deleted] = await db.delete(shops).where(eq(shops.id, id)).returning({ id: shops.id });
  return Boolean(deleted);
}

/**
 * Marks a shop as deleted while preserving its row for auditability.
 *
 * Hidden behavior: clears dead-link reports after the visibility switch.
 *
 * @param id - Shop id.
 * @param adminId - Actor admin id, nullable for system actions.
 * @param reason - Optional delete reason shown in dashboard.
 * @param wasReported - Indicates if deletion originated from user reports.
 * @returns Resolves when flags are persisted.
 */
export async function markAdminShopDeleted(
  id: number,
  adminId: number | null,
  reason: string | null,
  wasReported: boolean,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(shops)
      .set({
        visibility: "deleted",
        deletedBy: adminId,
        deleteReason: reason,
        deletedWasReported: wasReported,
        updatedAt: new Date(),
      })
      .where(eq(shops.id, id))
      .returning({ id: shops.id });

    if (updated) {
      await tx.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
    }

    return Boolean(updated);
  });
}

/**
 * Switches mutable visibility state and clears unrelated metadata.
 *
 * For `rejected`: stores `rejectionToken`, `rejectionAdminNote` and `rejectionLongText`
 * from options.
 * For `public`/`onhold`: clears all deletion and rejection metadata.
 *
 * @param id - Shop id.
 * @param visibility - Target visibility.
 * @param options - Optional rejection payload (only used when visibility is `"rejected"`).
 * @returns `true` if a row was updated, `false` when shop not found.
 */
export async function setAdminShopVisibility(
  id: number,
  visibility: ShopMutableVisibility,
  options?: {
    rejectionToken?: string | null;
    rejectionAdminNote?: string | null;
    rejectionLongText?: string | null;
  },
): Promise<boolean> {
  const isRejected = visibility === "rejected";
  const [updated] = await db
    .update(shops)
    .set({
      visibility,
      deletedBy: null,
      deletedWasReported: false,
      deleteReason: isRejected ? null : null,
      rejectionToken: isRejected ? (options?.rejectionToken ?? null) : null,
      rejectionAdminNote: isRejected ? (options?.rejectionAdminNote ?? null) : null,
      rejectionLongText: isRejected ? (options?.rejectionLongText ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, id))
    .returning({ id: shops.id });
  return Boolean(updated);
}

/**
 * Reads the canonical URL of a shop.
 *
 * @param id - Shop id.
 * @returns URL or `null` when shop does not exist.
 */
export async function getAdminShopUrl(id: number): Promise<string | null> {
  const [shop] = await db.select({ url: shops.url }).from(shops).where(eq(shops.id, id));
  return shop?.url ?? null;
}

/**
 * Stores the resolved OG image URL for a shop.
 *
 * @param id - Shop id.
 * @param ogImage - URL or `null` to clear.
 * @returns Resolves when update has been written.
 */
export async function setAdminShopOgImage(id: number, ogImage: string | null): Promise<void> {
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));
}

/**
 * Updates the delete reason for a soft-deleted shop.
 *
 * @param id - Shop id.
 * @param reason - New reason text or `null` to clear.
 * @returns Resolves when update has been written.
 */
export async function updateAdminShopDeleteReason(
  id: number,
  reason: string | null,
): Promise<boolean> {
  const [updated] = await db
    .update(shops)
    .set({ deleteReason: reason, updatedAt: new Date() })
    .where(eq(shops.id, id))
    .returning({ id: shops.id });
  return Boolean(updated);
}
