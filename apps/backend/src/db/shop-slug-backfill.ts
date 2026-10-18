import type { Sql } from "postgres";

import { allocateShopSlug, issuedShopTokens } from "@lmaa/shared";

/**
 * Assigns canonical slugs to every shop that does not have one yet.
 *
 * The migration runner calls this while holding its global advisory lock. Rows
 * are processed by id, so duplicate names receive the same suffixes on every
 * database. Inserts deliberately have no conflict suppression: an unexpected
 * collision aborts startup instead of leaving a shop without a canonical URL.
 *
 * @param sql - Vetted migration connection held under the advisory lock.
 * @returns Number of canonical slug rows inserted.
 */
export async function backfillShopSlugs(sql: Sql): Promise<number> {
  const [existing, missing] = await Promise.all([
    sql<Array<{ slug: string; shopId: number }>>`
      SELECT slug, shop_id AS "shopId"
        FROM shop_slugs
       ORDER BY slug
    `,
    sql<Array<{ id: number; name: string }>>`
      SELECT s.id, s.name
        FROM shops s
       WHERE NOT EXISTS (
         SELECT 1 FROM shop_slugs ss
          WHERE ss.shop_id = s.id AND ss.canonical = true
       )
       ORDER BY s.id
       FOR UPDATE OF s
    `,
  ]);

  const unavailable = issuedShopTokens([
    ...existing.map((row) => row.shopId),
    ...missing.map((shop) => shop.id),
  ]);
  for (const row of existing) unavailable.add(row.slug);

  const planned: Array<{ slug: string; shopId: number }> = [];
  for (const shop of missing) {
    const slug = allocateShopSlug(shop.name, unavailable);
    planned.push({ slug, shopId: shop.id });
    unavailable.add(slug);
  }

  await Promise.all(
    planned.map(
      ({ slug, shopId }) => sql`
      INSERT INTO shop_slugs (slug, shop_id, canonical)
      VALUES (${slug}, ${shopId}, true)
    `,
    ),
  );
  return planned.length;
}

/** Result of repairing canonical slugs after the legacy reservation correction. */
export interface ShopSlugRepairResult {
  repaired: number;
}

/**
 * Reallocates canonical slugs with only actually issued legacy tokens reserved.
 *
 * Existing canonical values are retained as historical aliases. The function
 * is idempotent: after a successful pass, every shop already owns the slug the
 * corrected allocator chooses and no writes are made on the next pass.
 *
 * @param sql - Vetted migration connection held under the advisory lock.
 * @returns Number of canonical shop slugs changed.
 */
export async function repairShopSlugs(sql: Sql): Promise<ShopSlugRepairResult> {
  const [rows, shops] = await Promise.all([
    sql<Array<{ slug: string; shopId: number; canonical: boolean }>>`
      SELECT slug, shop_id AS "shopId", canonical
        FROM shop_slugs
       ORDER BY shop_id, slug
    `,
    sql<Array<{ id: number; name: string }>>`
      SELECT id, name
        FROM shops
       ORDER BY id
       FOR UPDATE
    `,
  ]);

  const rowsByShopId = new Map<number, Array<(typeof rows)[number]>>();
  for (const row of rows) {
    const owned = rowsByShopId.get(row.shopId) ?? [];
    owned.push(row);
    rowsByShopId.set(row.shopId, owned);
  }

  const issuedTokens = issuedShopTokens(shops.map((shop) => shop.id));
  const unavailable = new Set([...issuedTokens, ...rows.map((row) => row.slug)]);
  const repairs: Array<{ shopId: number; desired: string; insert: boolean }> = [];

  for (const shop of shops) {
    const owned = rowsByShopId.get(shop.id) ?? [];
    const blocked = new Set(unavailable);
    for (const row of owned) blocked.delete(row.slug);
    for (const token of issuedTokens) blocked.add(token);

    const desired = allocateShopSlug(shop.name, blocked);
    if (owned.some((row) => row.canonical && row.slug === desired)) continue;

    const insert = !owned.some((row) => row.slug === desired);
    repairs.push({ shopId: shop.id, desired, insert });
    unavailable.add(desired);
  }

  await Promise.all(
    repairs.map(({ shopId, desired, insert }) => {
      const inserted = insert
        ? sql`
            INSERT INTO shop_slugs (slug, shop_id, canonical)
            VALUES (${desired}, ${shopId}, false)
          `
        : Promise.resolve();
      return inserted.then(
        () => sql`
        UPDATE shop_slugs
           SET canonical = (slug = ${desired})
         WHERE shop_id = ${shopId}
      `,
      );
    }),
  );

  return { repaired: repairs.length };
}
