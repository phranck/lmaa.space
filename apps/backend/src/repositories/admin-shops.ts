import type { ShopMutableVisibility, ShopVisibility } from "@lmaa/shared";
import type { Shop as SharedShop, ShopSummary } from "@lmaa/shared";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers, deadLinkReports, shopCategories, shops } from "../db/schema.js";
import type { Shop as DbShop } from "../db/schema.js";

export type AdminShopDetail = SharedShop;

export interface CreateAdminShopData {
  name: string;
  url: string;
  categoryIds: number[];
  region: string[];
  pickup?: string;
  shipping?: string;
  description?: string;
}

export interface UpdateAdminShopData {
  name?: string;
  url?: string;
  categoryIds?: number[];
  region?: string[];
  pickup?: string;
  shipping?: string;
  description?: string;
  isActive?: boolean;
}

export async function listAdminShops(visibility?: ShopVisibility): Promise<ShopSummary[]> {
  return db.execute<ShopSummary & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region,
           s.visibility,
           s.delete_reason as "deleteReason",
           s.deleted_was_reported as "deletedWasReported",
           u.username as "deletedByUsername",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN admin_users u ON u.id = s.deleted_by
    ${visibility ? sql`WHERE s.visibility = ${visibility}` : sql``}
    GROUP BY s.id, u.username
    ORDER BY s.name
  `);
}

export async function getAdminShopById(id: number): Promise<AdminShopDetail | null> {
  const [shop] = await db.execute<AdminShopDetail & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
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

  return shop ?? null;
}

export async function createAdminShop(data: CreateAdminShopData): Promise<DbShop> {
  return db.transaction(async (tx) => {
    const { categoryIds, ...shopData } = data;
    const [shop] = await tx.insert(shops).values(shopData).returning();

    if (categoryIds.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryIds.map((categoryId) => ({ shopId: shop.id, categoryId })));
    }

    return shop;
  });
}

export async function updateAdminShop(
  id: number,
  data: UpdateAdminShopData,
): Promise<DbShop | null> {
  return db.transaction(async (tx) => {
    const { categoryIds, ...shopData } = data;

    const [shop] = await tx
      .update(shops)
      .set({ ...shopData, updatedAt: new Date() })
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

    return shop;
  });
}

export async function shopExists(id: number): Promise<boolean> {
  const [row] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, id));
  return Boolean(row);
}

export async function permanentlyDeleteAdminShop(id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
    await tx.delete(shops).where(eq(shops.id, id));
  });
}

export async function markAdminShopDeleted(
  id: number,
  adminId: number | null,
  reason: string | null,
  wasReported: boolean,
): Promise<void> {
  await db
    .update(shops)
    .set({
      visibility: "deleted",
      deletedBy: adminId,
      deleteReason: reason,
      deletedWasReported: wasReported,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, id));

  await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
}

export async function setAdminShopVisibility(
  id: number,
  visibility: ShopMutableVisibility,
): Promise<void> {
  await db
    .update(shops)
    .set({
      visibility,
      deletedBy: null,
      deleteReason: null,
      deletedWasReported: false,
      updatedAt: new Date(),
    })
    .where(eq(shops.id, id));
}

export async function getAdminShopUrl(id: number): Promise<string | null> {
  const [shop] = await db.select({ url: shops.url }).from(shops).where(eq(shops.id, id));
  return shop?.url ?? null;
}

export async function setAdminShopOgImage(id: number, ogImage: string | null): Promise<void> {
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));
}
