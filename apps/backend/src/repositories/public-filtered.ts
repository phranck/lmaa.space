import { sql } from "drizzle-orm";

import type { ShopCategory } from "@lmaa/shared";

import type { CategoryShopRow } from "./public.js";
import { db } from "../db/index.js";
import { geocode } from "../lib/geocoding.js";
import type { ShopFilterParams } from "../lib/shop-filters.js";
import { parseCountryFilter, parseRegionFilter } from "../lib/shop-filters.js";

/**
 * Public shop row enriched with geo coordinates from headquarters.
 */
export type FilteredShopRow = CategoryShopRow & {
  categories: ShopCategory[];
  latitude: number | null;
  longitude: number | null;
};

interface ResolvedFilters {
  regionCodes: string[];
  countryCodes: string[];
  centerLat: number | undefined;
  centerLng: number | undefined;
  radiusKm: number;
}

async function resolveFilters(params: ShopFilterParams): Promise<ResolvedFilters> {
  const regionCodes = parseRegionFilter(params.region);
  const countryCodes = parseCountryFilter(params.country);
  let centerLat: number | undefined;
  let centerLng: number | undefined;
  const radiusKm = params.radius ?? 50;

  if (params.city) {
    const geo = await geocode(params.city, countryCodes[0]);
    if (geo) {
      centerLat = geo.latitude;
      centerLng = geo.longitude;
    }
  }

  return { regionCodes, countryCodes, centerLat, centerLng, radiusKm };
}

function hasActiveFilters(f: ResolvedFilters): boolean {
  return f.regionCodes.length > 0 || f.countryCodes.length > 0 || f.centerLat !== undefined;
}

function buildConditions(f: ResolvedFilters) {
  const conditions: ReturnType<typeof sql>[] = [];

  if (f.regionCodes.length > 0) {
    conditions.push(
      sql`s.region ?| ARRAY[${sql.join(
        f.regionCodes.map((r) => sql`${r}`),
        sql`,`,
      )}]`,
    );
  }

  if (f.countryCodes.length > 0) {
    conditions.push(
      sql`hq.country_code IN (${sql.join(
        f.countryCodes.map((c) => sql`${c}`),
        sql`,`,
      )})`,
    );
  }

  if (f.centerLat !== undefined && f.centerLng !== undefined) {
    conditions.push(sql`
      hq.latitude IS NOT NULL AND hq.longitude IS NOT NULL
      AND (
        6371 * acos(
          LEAST(1.0, cos(radians(${f.centerLat})) * cos(radians(hq.latitude))
          * cos(radians(hq.longitude) - radians(${f.centerLng}))
          + sin(radians(${f.centerLat})) * sin(radians(hq.latitude)))
        )
      ) <= ${f.radiusKm}
    `);
  }

  return conditions;
}

function whereFragment(conditions: ReturnType<typeof sql>[]) {
  if (conditions.length === 0) return sql``;
  return sql`AND ${sql.join(conditions, sql` AND `)}`;
}

// ---------------------------------------------------------------------------
// Categories with filtered shop counts
// ---------------------------------------------------------------------------

export async function listFilteredCategoriesWithCount(filters: ShopFilterParams) {
  const f = await resolveFilters(filters);

  if (!hasActiveFilters(f)) {
    return db.execute<{
      id: number;
      name: string;
      slug: string;
      imageUrl: string | null;
      shopCount: number;
    }>(sql`
      SELECT c.id, c.name, c.slug, c.image_url as "imageUrl",
             COUNT(DISTINCT s.id)::int as "shopCount"
      FROM categories c
      LEFT JOIN shop_categories sc ON sc.category_id = c.id
      LEFT JOIN shops s ON s.id = sc.shop_id
        AND s.is_active = true AND s.visibility = 'public'
      GROUP BY c.id
      ORDER BY c.name
    `);
  }

  const extra = whereFragment(buildConditions(f));

  return db.execute<{
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    shopCount: number;
  }>(sql`
    SELECT c.id, c.name, c.slug, c.image_url as "imageUrl",
           COUNT(DISTINCT s.id)::int as "shopCount"
    FROM categories c
    LEFT JOIN shop_categories sc ON sc.category_id = c.id
    LEFT JOIN shops s ON s.id = sc.shop_id
      AND s.is_active = true AND s.visibility = 'public'
    LEFT JOIN shop_headquarters hq ON hq.shop_id = s.id
    WHERE TRUE ${extra}
    GROUP BY c.id
    ORDER BY c.name
  `);
}

// ---------------------------------------------------------------------------
// Shops for a specific category (with filters)
// ---------------------------------------------------------------------------

export async function listFilteredShopsByCategoryId(
  categoryId: number,
  filters: ShopFilterParams,
) {
  const f = await resolveFilters(filters);
  const extra = whereFragment(buildConditions(f));

  return db.execute<FilteredShopRow>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           s.social_media as "socialMedia",
           s.like_count as "likeCount",
           hq.latitude, hq.longitude,
           COALESCE(
             json_agg(json_build_object('id', cat.id, 'slug', cat.slug, 'name', cat.name))
             FILTER (WHERE cat.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    INNER JOIN shop_categories sc ON sc.shop_id = s.id AND sc.category_id = ${categoryId}
    LEFT JOIN shop_headquarters hq ON hq.shop_id = s.id
    LEFT JOIN shop_categories sc2 ON sc2.shop_id = s.id
    LEFT JOIN categories cat ON cat.id = sc2.category_id
    WHERE s.is_active = true AND s.visibility = 'public'
    ${extra}
    GROUP BY s.id, hq.latitude, hq.longitude
    ORDER BY s.name
  `);
}

// ---------------------------------------------------------------------------
// All public shops (with filters)
// ---------------------------------------------------------------------------

export async function listFilteredPublicShops(filters: ShopFilterParams) {
  const f = await resolveFilters(filters);
  const extra = whereFragment(buildConditions(f));

  return db.execute<FilteredShopRow>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           s.contact_email as "contactEmail",
           s.social_media as "socialMedia",
           s.like_count as "likeCount",
           hq.latitude, hq.longitude,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN shop_headquarters hq ON hq.shop_id = s.id
    WHERE s.is_active = true AND s.visibility = 'public'
    ${extra}
    GROUP BY s.id, hq.latitude, hq.longitude
    ORDER BY s.name
  `);
}

// ---------------------------------------------------------------------------
// Filtered search
// ---------------------------------------------------------------------------

export async function searchFilteredPublicShops(
  query: string,
  filters: ShopFilterParams,
) {
  const escaped = query.replace(/[%_\\\\]/g, "\\\\$&");
  const pattern = `%${escaped}%`;

  const f = await resolveFilters(filters);
  const extra = whereFragment(buildConditions(f));

  return db.execute<FilteredShopRow & { rank: number }>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.contact_email as "contactEmail",
           s.social_media as "socialMedia",
           s.like_count as "likeCount",
           hq.latitude, hq.longitude,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories,
           CASE
             WHEN s.name ILIKE ${pattern} THEN 1
             WHEN s.url ILIKE ${pattern} THEN 2
             WHEN s.description ILIKE ${pattern} THEN 3
             ELSE 4
           END as rank
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN shop_headquarters hq ON hq.shop_id = s.id
    WHERE s.is_active = true AND s.visibility = 'public'
      AND (
        s.name ILIKE ${pattern}
        OR s.url ILIKE ${pattern}
        OR s.description ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM shop_categories sc2
          JOIN categories c2 ON c2.id = sc2.category_id
          WHERE sc2.shop_id = s.id AND c2.name ILIKE ${pattern}
        )
      )
    ${extra}
    GROUP BY s.id, hq.latitude, hq.longitude
    ORDER BY rank, s.name
    LIMIT 40
  `);
}

// ---------------------------------------------------------------------------
// Filter options (available countries)
// ---------------------------------------------------------------------------

export async function listAvailableFilterCountries() {
  return db.execute<{ code: string; name: string }>(sql`
    SELECT DISTINCT gc.code, gc.name
    FROM shop_headquarters hq
    JOIN shop_geo_countries gc ON gc.code = hq.country_code
    JOIN shops s ON s.id = hq.shop_id
      AND s.is_active = true AND s.visibility = 'public'
    ORDER BY gc.name
  `);
}
