import { eq, sql } from "drizzle-orm";

import { allocateShopSlug, issuedShopTokens } from "@lmaa/shared";

import { db } from "../db/client.js";
import { shopSlugs } from "../db/schema.js";
import { SHOP_SLUG_ALLOCATION_LOCK } from "../db/shop-slug-lock.js";

type DbLike = Pick<typeof db, "select" | "insert" | "update" | "execute">;

/** Persisted slug state used while planning a canonical transition. */
export interface ShopSlugState {
  slug: string;
  shopId: number;
}

/** Planned database transition for a shop's canonical slug. */
export interface CanonicalShopSlugPlan {
  slug: string;
  change: "none" | "insert" | "update";
}

/**
 * Plans the canonical slug transition without mutating persistence.
 *
 * @param rows - Every persisted canonical shop slug.
 * @param shopId - Shop being created or renamed.
 * @param name - Current shop display name.
 * @returns Slug and the minimal persistence transition needed for it.
 */
export function planCanonicalShopSlug(
  rows: ShopSlugState[],
  shopId: number,
  name: string,
): CanonicalShopSlugPlan {
  const unavailable = issuedShopTokens(new Set([...rows.map((row) => row.shopId), shopId]));
  for (const row of rows) {
    if (row.shopId !== shopId) unavailable.add(row.slug);
  }
  const slug = allocateShopSlug(name, unavailable);
  const current = rows.find((row) => row.shopId === shopId);
  if (current?.slug === slug) return { slug, change: "none" };
  return { slug, change: current ? "update" : "insert" };
}

/** Public identifier resolution before the full shop payload is loaded. */
export interface PublicShopSlugMatch {
  id: number;
  slug: string;
}

/**
 * Assigns the canonical slug for a newly created or renamed shop.
 *
 * Allocation is serialized inside the caller's transaction. A changed slug
 * replaces the existing canonical value, and the schema permits no aliases.
 *
 * @param tx - Existing shop-write transaction.
 * @param shopId - Shop receiving the canonical URL.
 * @param name - Current shop name from which the slug is derived.
 * @returns Current canonical slug after the transaction changes.
 */
export async function assignCanonicalShopSlug(
  tx: DbLike,
  shopId: number,
  name: string,
): Promise<string> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${SHOP_SLUG_ALLOCATION_LOCK})`);
  const rows = await tx.select({ slug: shopSlugs.slug, shopId: shopSlugs.shopId }).from(shopSlugs);
  const plan = planCanonicalShopSlug(rows, shopId, name);
  if (plan.change === "none") return plan.slug;

  if (plan.change === "update") {
    await tx.update(shopSlugs).set({ slug: plan.slug }).where(eq(shopSlugs.shopId, shopId));
  } else {
    await tx.insert(shopSlugs).values({ slug: plan.slug, shopId });
  }
  return plan.slug;
}

/**
 * Resolves a canonical slug for a visible public shop.
 *
 * @param identifier - Persisted lowercase shop slug from the request path.
 * @returns Matching shop id and canonical slug, or `null` when no visible shop owns it.
 */
export async function findPublicShopBySlug(
  identifier: string,
): Promise<PublicShopSlugMatch | null> {
  const [match] = await db.execute<PublicShopSlugMatch & Record<string, unknown>>(sql`
    SELECT s.id, requested.slug
      FROM shop_slugs requested
      JOIN shops s ON s.id = requested.shop_id
     WHERE requested.slug = ${identifier}
       AND s.is_active = true
       AND s.visibility = 'public'
     LIMIT 1
  `);
  return match ?? null;
}
