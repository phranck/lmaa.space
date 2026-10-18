import type { Sql } from "postgres";

import { allocateShopSlug } from "@lmaa/shared";

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
  const existing = await sql<Array<{ slug: string; shopId: number }>>`
    SELECT slug, shop_id AS "shopId"
      FROM shop_slugs
     ORDER BY slug
  `;
  const missing = await sql<Array<{ id: number; name: string }>>`
    SELECT s.id, s.name
      FROM shops s
     WHERE NOT EXISTS (
       SELECT 1 FROM shop_slugs ss
        WHERE ss.shop_id = s.id AND ss.canonical = true
     )
     ORDER BY s.id
     FOR UPDATE OF s
  `;

  const unavailable = new Set(existing.map((row) => row.slug));
  for (const shop of missing) {
    const slug = allocateShopSlug(shop.name, unavailable);
    await sql`
      INSERT INTO shop_slugs (slug, shop_id, canonical)
      VALUES (${slug}, ${shop.id}, true)
    `;
    unavailable.add(slug);
  }

  return missing.length;
}
