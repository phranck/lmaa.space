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
  canonical: boolean;
}

/** Planned database transition for a shop's canonical slug. */
export interface CanonicalShopSlugPlan {
  slug: string;
  change: "none" | "insert" | "promote";
}

/**
 * Plans the canonical slug transition without mutating persistence.
 *
 * @param rows - Every currently allocated canonical and historical slug.
 * @param shopId - Shop being created or renamed.
 * @param name - Current shop display name.
 * @returns Slug and the minimal persistence transition needed for it.
 */
export function planCanonicalShopSlug(
  rows: ShopSlugState[],
  shopId: number,
  name: string,
): CanonicalShopSlugPlan {
  const owned = rows.filter((row) => row.shopId === shopId);
  const unavailable = issuedShopTokens(new Set([...rows.map((row) => row.shopId), shopId]));
  for (const row of rows) {
    if (row.shopId !== shopId) unavailable.add(row.slug);
  }
  const slug = allocateShopSlug(name, unavailable);
  const current = owned.find((row) => row.canonical);
  if (current?.slug === slug) return { slug, change: "none" };
  return {
    slug,
    change: owned.some((row) => row.slug === slug) ? "promote" : "insert",
  };
}

/** Public identifier resolution before the full shop payload is loaded. */
export interface PublicShopSlugMatch {
  id: number;
  slug: string;
  canonical: boolean;
}

/**
 * Assigns the canonical slug for a newly created or renamed shop.
 *
 * Allocation is serialized inside the caller's transaction. A changed slug
 * demotes the previous canonical row but keeps it as a permanent alias. An
 * existing alias owned by the same shop may become canonical again.
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
  const rows = await tx
    .select({ slug: shopSlugs.slug, shopId: shopSlugs.shopId, canonical: shopSlugs.canonical })
    .from(shopSlugs);
  const plan = planCanonicalShopSlug(rows, shopId, name);
  if (plan.change === "none") return plan.slug;

  await tx.update(shopSlugs).set({ canonical: false }).where(eq(shopSlugs.shopId, shopId));
  if (plan.change === "promote") {
    await tx.update(shopSlugs).set({ canonical: true }).where(eq(shopSlugs.slug, plan.slug));
  } else {
    await tx.insert(shopSlugs).values({ slug: plan.slug, shopId, canonical: true });
  }
  return plan.slug;
}

/**
 * Resolves a canonical or historical slug for a visible public shop.
 *
 * @param identifier - Persisted lowercase shop slug from the request path.
 * @returns Matching shop id, current canonical slug, and whether the requested
 *   slug was canonical, or `null` when no visible shop owns it.
 */
export async function findPublicShopBySlug(
  identifier: string,
): Promise<PublicShopSlugMatch | null> {
  const [match] = await db.execute<PublicShopSlugMatch & Record<string, unknown>>(sql`
    SELECT s.id, canonical.slug, requested.canonical
      FROM shop_slugs requested
      JOIN shops s ON s.id = requested.shop_id
      JOIN shop_slugs canonical
        ON canonical.shop_id = s.id AND canonical.canonical = true
     WHERE requested.slug = ${identifier}
       AND s.is_active = true
       AND s.visibility = 'public'
     LIMIT 1
  `);
  return match ?? null;
}
