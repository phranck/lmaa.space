import type { Shop, ShopCategory } from "@lmaa/shared";
import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  categories,
  contentPages,
  deadLinkReports,
  navItems,
  shopCategories,
  shopConcernReports,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";

/**
 * Shared shop shape used in public list/category queries.
 */
export type CategoryShopRow = Pick<
  Shop,
  "id" | "name" | "url" | "region" | "pickup" | "shipping" | "description" | "ogImage"
>;
/**
 * Public shop row with hydrated categories.
 */
export type PublicShopRow = CategoryShopRow & { categories: ShopCategory[] };
/**
 * Full-text search result including ranking score.
 */
export type SearchShopRow = Shop & { categories: ShopCategory[]; rank: number };
/**
 * Minimal shape returned by duplicate URL checks.
 */
export interface CheckUrlRow {
  id: number;
  name: string;
  categories: ShopCategory[];
}

/**
 * Lists all categories plus number of currently public/active shops.
 *
 * @returns Category rows with `shopCount`.
 */
export async function listPublicCategoriesWithShopCount() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      imageUrl: categories.imageUrl,
      shopCount: count(shops.id),
    })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(
      shops,
      and(
        eq(shops.id, shopCategories.shopId),
        eq(shops.isActive, true),
        eq(shops.visibility, "public"),
      ),
    )
    .groupBy(categories.id)
    .orderBy(categories.name);
}

/**
 * Counts visible public shops.
 *
 * @returns Number of active shops with `visibility=public`.
 */
export async function countPublicShops(): Promise<number> {
  const [row] = await db
    .select({ total: count(shops.id) })
    .from(shops)
    .where(and(eq(shops.isActive, true), eq(shops.visibility, "public")));
  return row?.total ?? 0;
}

/**
 * Resolves a category by slug.
 *
 * @param slug - URL slug.
 * @returns Category row or `null` if slug does not exist.
 */
export async function getPublicCategoryBySlug(slug: string) {
  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return category ?? null;
}

/**
 * Lists public shops belonging to one category.
 *
 * @param categoryId - Category id.
 * @returns SQL result rows with core shop fields.
 */
export async function listPublicShopsByCategoryId(categoryId: number) {
  return db.execute<CategoryShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage"
    FROM shops s
    INNER JOIN shop_categories sc ON sc.shop_id = s.id AND sc.category_id = ${categoryId}
    WHERE s.is_active = true AND s.visibility = 'public'
    ORDER BY s.name
  `);
}

/**
 * Lists all public shops with aggregated category metadata.
 *
 * @returns SQL rows suitable for frontend catalog rendering.
 */
export async function listAllPublicShopsWithCategories() {
  return db.execute<PublicShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.is_active = true AND s.visibility = 'public'
    GROUP BY s.id
    ORDER BY s.name
  `);
}

/**
 * Executes PostgreSQL full-text search over public shops.
 *
 * @param query - Raw user search query (websearch syntax).
 * @returns Ranked result rows limited to top matches.
 */
export async function searchPublicShops(query: string) {
  const escaped = query.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;

  return db.execute<SearchShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
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
    GROUP BY s.id
    ORDER BY rank, s.name
    LIMIT 40
  `);
}

/**
 * Searches categories by escaped lowercase query fragment.
 *
 * @param escapedQuery - Already escaped query text for `LIKE`.
 * @returns Up to five matching category rows.
 */
export async function searchPublicCategoriesByEscapedQuery(escapedQuery: string) {
  return db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) LIKE ${`%${escapedQuery}%`} ESCAPE '\\'`)
    .limit(5);
}

/**
 * Finds a public shop by normalized hostname.
 *
 * @param hostname - Hostname without scheme/path.
 * @returns Matching shop summary or `null`.
 */
export async function findPublicShopByHostname(hostname: string) {
  const [row] = await db.execute<CheckUrlRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) AS categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE replace(split_part(split_part(s.url, '://', 2), '/', 1), 'www.', '') = ${hostname}
    GROUP BY s.id
    LIMIT 1
  `);

  return row ?? null;
}

/**
 * Submission payload accepted from the public website.
 */
export interface CreatePublicSubmissionInput {
  shopName: string;
  shopUrl: string;
  categorySuggestion: string | null;
  region: string[];
  shipping: string;
  description: string;
  submitterEmail: string | null;
  submitterNote: string | null;
}

/**
 * Inserts a new public shop submission.
 *
 * @param input - Validated submission payload.
 * @returns New submission id.
 */
export async function createPublicSubmission(input: CreatePublicSubmissionInput): Promise<number> {
  const [submission] = await db.insert(submissions).values(input).returning({ id: submissions.id });
  return submission.id;
}

/**
 * Inserts submission↔category links.
 *
 * Hidden behavior: no-op for empty category arrays.
 *
 * @param submissionId - Parent submission id.
 * @param categoryIds - Category ids to link.
 * @returns Resolves when links are persisted.
 */
export async function addSubmissionCategoryLinks(
  submissionId: number,
  categoryIds: number[],
): Promise<void> {
  if (categoryIds.length === 0) {
    return;
  }

  await db
    .insert(submissionCategories)
    .values(categoryIds.map((categoryId) => ({ submissionId, categoryId })));
}

/**
 * Lists navigation entries for public rendering.
 *
 * Hidden behavior: linked content pages are only returned when published.
 *
 * @param navId - Target nav (`header` or `footer`).
 * @returns Ordered nav rows including optional page titles.
 */
export async function listPublicNavItems(navId: "header" | "footer") {
  return db
    .select({
      id: navItems.id,
      navId: navItems.navId,
      pageSlug: navItems.pageSlug,
      pageTitle: contentPages.title,
      url: navItems.url,
      target: navItems.target,
      label: navItems.label,
      position: navItems.position,
    })
    .from(navItems)
    .leftJoin(contentPages, eq(navItems.pageSlug, contentPages.slug))
    .where(
      and(
        eq(navItems.navId, navId),
        or(eq(contentPages.status, "published"), isNull(navItems.pageSlug)),
      ),
    )
    .orderBy(asc(navItems.position));
}

/**
 * Lists all published content pages for static path generation.
 *
 * @returns Slug/title pairs for published pages only.
 */
export async function listPublishedContentPages() {
  return db
    .select({ slug: contentPages.slug, title: contentPages.title })
    .from(contentPages)
    .where(eq(contentPages.status, "published"))
    .orderBy(contentPages.slug);
}

/**
 * Loads a single published content page by slug.
 *
 * @param slug - Page slug.
 * @returns Page row or `null` when absent/unpublished.
 */
export async function getPublishedContentPageBySlug(slug: string) {
  const [page] = await db
    .select()
    .from(contentPages)
    .where(and(eq(contentPages.slug, slug), eq(contentPages.status, "published")))
    .limit(1);

  return page ?? null;
}

/**
 * Returns rejection page data for a rejected submission.
 *
 * @param id - Submission id.
 * @returns `{ shopName, shopUrl, rejectionLongText }` or `null` if not found / not rejected.
 */
export async function getRejectionPageByToken(token: string) {
  const [row] = await db
    .select({
      shopName: submissions.shopName,
      shopUrl: submissions.shopUrl,
      rejectionLongText: submissions.rejectionLongText,
    })
    .from(submissions)
    .where(and(eq(submissions.rejectionToken, token), eq(submissions.status, "rejected")))
    .limit(1);

  return row ?? null;
}

/**
 * Resolves a minimal public shop record by id.
 *
 * @param id - Shop id.
 * @returns Shop identity or `null`.
 */
export async function getPublicShopById(id: number) {
  const [shop] = await db
    .select({ id: shops.id, name: shops.name, url: shops.url })
    .from(shops)
    .where(eq(shops.id, id))
    .limit(1);

  return shop ?? null;
}

/**
 * Stores a dead-link report event.
 *
 * @param shopId - Reported shop id.
 * @param ipHash - Hashed source IP for throttling/abuse checks.
 * @returns Resolves when report row is inserted.
 */
export async function insertDeadLinkReport(shopId: number, ipHash: string): Promise<void> {
  await db.insert(deadLinkReports).values({ shopId, ipHash });
}

/**
 * Counts dead-link reports for one shop.
 *
 * @param shopId - Shop id.
 * @returns Number of reports.
 */
export async function countDeadLinkReportsForShop(shopId: number): Promise<number> {
  const [row] = await db
    .select({ reportCount: count(deadLinkReports.id) })
    .from(deadLinkReports)
    .where(eq(deadLinkReports.shopId, shopId));
  return row?.reportCount ?? 0;
}

/**
 * Stores a moderation concern report for a shop.
 *
 * @param shopId - Shop id.
 * @param reason - Free-text concern reason.
 * @param ipHash - Hashed source IP.
 * @returns Resolves when row is inserted.
 */
export async function insertShopConcernReport(
  shopId: number,
  reason: string,
  ipHash: string,
): Promise<void> {
  await db.insert(shopConcernReports).values({ shopId, reason, ipHash });
}
