import { and, asc, count, eq, isNull, or, sql } from "drizzle-orm";

import type { Shop, ShopCategory } from "@lmaa/shared";

import { db } from "../db/client.js";
import {
  categories,
  contentPages,
  deadLinkReports,
  navItems,
  shopCategories,
  shopConcernReports,
  shopLikes,
  shops,
  submissions,
} from "../db/schema.js";

/**
 * Shared shop shape used in public list/category queries.
 */
export type CategoryShopRow = Pick<
  Shop,
  | "id"
  | "name"
  | "url"
  | "region"
  | "pickup"
  | "shipping"
  | "description"
  | "ogImage"
  | "logoBackgroundColor"
  | "socialMedia"
  | "paymentMethods"
  | "likeCount"
>;
/**
 * Public shop row with hydrated categories.
 */
export type PublicShopRow = CategoryShopRow & { categories: ShopCategory[] };
/**
 * Full-text search result including ranking score.
 */
type SearchShopRow = Shop & { categories: ShopCategory[]; rank: number };
/**
 * Minimal shape returned by domain-based shop lookups.
 */
interface ShopByDomainRow {
  id: number;
  name: string;
  url: string;
  visibility: "public" | "onhold" | "deleted" | "rejected";
  rejectionToken: string | null;
}

function shopCheckNotesMatch(pattern: string) {
  return sql`(
    COALESCE(s.shop_check_notes->>'companyPresentation', '') ILIKE ${pattern}
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(s.shop_check_notes->'focus', '[]'::jsonb)) notes_focus(value)
      WHERE notes_focus.value ILIKE ${pattern}
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(s.shop_check_notes->'brandsOrProducts', '[]'::jsonb)) notes_brands(value)
      WHERE notes_brands.value ILIKE ${pattern}
    )
  )`;
}

function categoryNameMatch(pattern: string) {
  return sql`EXISTS (
    SELECT 1 FROM shop_categories sc2
    JOIN categories c2 ON c2.id = sc2.category_id
    WHERE sc2.shop_id = s.id AND c2.name ILIKE ${pattern}
  )`;
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
      imagePhotographer: categories.imagePhotographer,
      imagePhotographerUrl: categories.imagePhotographerUrl,
      imageFocalPointY: categories.imageFocalPointY,
      unsplashImageId: categories.unsplashImageId,
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
 * Counts submissions still awaiting moderation.
 *
 * @returns Number of submissions with `status = 'pending'`.
 */
export async function countPendingSubmissions(): Promise<number> {
  const [row] = await db
    .select({ total: count(submissions.id) })
    .from(submissions)
    .where(eq(submissions.status, "pending"));
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
      imagePhotographer: categories.imagePhotographer,
      imagePhotographerUrl: categories.imagePhotographerUrl,
      imageFocalPointY: categories.imageFocalPointY,
      unsplashImageId: categories.unsplashImageId,
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
  return db
    .select({
      id: shops.id,
      name: shops.name,
      url: shops.url,
      region: shops.region,
      pickup: shops.pickup,
      shipping: shops.shipping,
      description: shops.description,
      ogImage: shops.ogImage,
      logoBackgroundColor: shops.logoBackgroundColor,
      socialMedia: shops.socialMedia,
      paymentMethods: shops.paymentMethods,
      likeCount: shops.likeCount,
    })
    .from(shops)
    .innerJoin(
      shopCategories,
      and(eq(shopCategories.shopId, shops.id), eq(shopCategories.categoryId, categoryId)),
    )
    .where(and(eq(shops.isActive, true), eq(shops.visibility, "public")))
    .orderBy(asc(shops.name));
}

/**
 * Lists all public shops with aggregated category metadata.
 *
 * @returns SQL rows suitable for frontend catalog rendering.
 */
export async function listAllPublicShopsWithCategories() {
  return db.execute<PublicShopRow>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           s.logo_background_color as "logoBackgroundColor",
           s.social_media as "socialMedia",
           s.payment_methods as "paymentMethods",
           s.like_count as "likeCount",
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
 * When `postalCodePrefix` is provided, shops are also matched by the postal
 * code of their headquarters (prefix match, whitespace-insensitive). Postal
 * matches are ranked between URL and description matches.
 *
 * @param query - Raw user search query (websearch syntax).
 * @param options.postalCodePrefix - Normalized postal prefix (uppercase, no whitespace) or `null`.
 * @returns Ranked result rows limited to top matches.
 */
export async function searchPublicShops(
  query: string,
  options: { postalCodePrefix?: string | null } = {},
) {
  const escaped = query.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  const postalPrefix = options.postalCodePrefix ?? null;
  const postalPattern = postalPrefix ? `${postalPrefix}%` : null;
  const postalMatch = postalPattern
    ? sql`REGEXP_REPLACE(UPPER(hq.postal_code), '[[:space:]\-]', '', 'g') LIKE ${postalPattern}`
    : sql`false`;
  const notesMatch = shopCheckNotesMatch(pattern);
  const categoryMatch = categoryNameMatch(pattern);

  return db.execute<SearchShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           s.logo_background_color as "logoBackgroundColor",
           s.is_active as "isActive",
           s.social_media as "socialMedia",
           s.payment_methods as "paymentMethods",
           s.like_count as "likeCount",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories,
           CASE
             WHEN s.name ILIKE ${pattern} THEN 1
             WHEN s.url ILIKE ${pattern} THEN 2
             WHEN bool_or(${postalMatch}) THEN 3
             WHEN ${notesMatch} THEN 4
             WHEN s.description ILIKE ${pattern} THEN 5
             WHEN ${categoryMatch} THEN 6
             ELSE 7
           END as rank
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    LEFT JOIN shop_headquarters hq ON hq.shop_id = s.id
    WHERE s.is_active = true AND s.visibility = 'public'
      AND (
        s.name ILIKE ${pattern}
        OR s.url ILIKE ${pattern}
        OR ${notesMatch}
        OR s.description ILIKE ${pattern}
        OR ${postalMatch}
        OR ${categoryMatch}
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
 * Finds a shop by domain (DOMAIN.TLD) with visibility `public` or `rejected`.
 *
 * Uses a SQL LIKE pre-filter on the raw URL column and then verifies the match
 * in JS via `tldts.getDomain()` for accurate DOMAIN.TLD extraction.
 *
 * @param domain - Normalized domain (e.g. "example.com").
 * @returns Matching shop row or `null`.
 */
export async function findShopByDomain(domain: string) {
  const [{ getDomain }, candidates] = await Promise.all([
    import("tldts"),
    db.execute<ShopByDomainRow & Record<string, unknown>>(sql`
      SELECT s.id, s.name, s.url, s.visibility, s.rejection_token AS "rejectionToken"
      FROM shops s
      WHERE s.url LIKE ${"%" + domain + "%"}
        AND s.visibility IN ('public', 'rejected')
      LIMIT 10
    `),
  ]);

  return candidates.find((row) => getDomain(row.url) === domain) ?? null;
}

interface RejectedSubmissionRow {
  id: number;
  shopName: string;
  shopUrl: string;
  rejectionToken: string | null;
}

/**
 * Finds a rejected submission by domain (DOMAIN.TLD).
 *
 * Uses the same LIKE pre-filter + tldts verification as `findShopByDomain`.
 *
 * @param domain - Normalized domain (e.g. "modibodi.com").
 * @returns Matching submission row or `null`.
 */
export async function findRejectedSubmissionByDomain(domain: string) {
  const [{ getDomain }, candidates] = await Promise.all([
    import("tldts"),
    db.execute<RejectedSubmissionRow & Record<string, unknown>>(sql`
      SELECT s.id, s.shop_name AS "shopName", s.shop_url AS "shopUrl", s.rejection_token AS "rejectionToken"
      FROM submissions s
      WHERE s.shop_url LIKE ${"%" + domain + "%"}
        AND s.status = 'rejected'
      LIMIT 10
    `),
  ]);

  return candidates.find((row) => getDomain(row.shopUrl) === domain) ?? null;
}

interface PendingSubmissionRow {
  id: number;
  shopName: string;
  shopUrl: string;
}

export interface PublicRejectedShopListRow {
  source: "shop" | "submission";
  id: number;
  shopName: string;
  ogImage: string | null;
  logoBackgroundColor: string | null;
  submittedAt: Date;
  rejectedAt: Date;
  rejectionToken: string;
}

interface PublicRejectedShopListParams {
  search: string;
  page: number;
  pageSize: number | "all";
  sortBy: "shopName" | "submittedAt" | "rejectedAt";
  sortDir: "asc" | "desc";
}

/**
 * Finds a submission awaiting moderation by domain (DOMAIN.TLD).
 *
 * Matches submissions whose status is either `pending` or `onhold`, i.e. those
 * that will still produce a published shop once approved. Used by the domain
 * deduplication check to block new submissions for a domain that is already
 * queued for review.
 *
 * @param domain - Normalized domain (e.g. "goodkarmacoffee.de").
 * @returns Matching submission row or `null`.
 */
export async function findPendingSubmissionByDomain(domain: string) {
  const [{ getDomain }, candidates] = await Promise.all([
    import("tldts"),
    db.execute<PendingSubmissionRow & Record<string, unknown>>(sql`
      SELECT s.id, s.shop_name AS "shopName", s.shop_url AS "shopUrl"
      FROM submissions s
      WHERE s.shop_url LIKE ${"%" + domain + "%"}
        AND s.status IN ('pending', 'onhold')
      LIMIT 10
    `),
  ]);

  return candidates.find((row) => getDomain(row.shopUrl) === domain) ?? null;
}

function publicRejectedShopSearchClause(search: string) {
  const trimmed = search.trim();
  if (!trimmed) return sql``;
  const escaped = trimmed.replace(/[%_\\]/g, "\\$&");
  const pattern = `%${escaped}%`;
  return sql`WHERE (
    rejected."shopName" ILIKE ${pattern} ESCAPE '\\'
    OR rejected."rejectionLongText" ILIKE ${pattern} ESCAPE '\\'
  )`;
}

/**
 * Counts rejected shops and rejected submissions with public rejection pages.
 *
 * @param search - Optional shop-name search.
 * @returns Total number of matching public rejection entries.
 */
export async function countPublicRejectedShops(search: string): Promise<number> {
  const searchClause = publicRejectedShopSearchClause(search);
  const [row] = await db.execute<{ total: number | string }>(sql`
    WITH rejected AS (
      SELECT
        s.name AS "shopName",
        s.rejection_long_text AS "rejectionLongText"
      FROM shops s
      WHERE s.visibility = 'rejected'
        AND s.rejection_token IS NOT NULL
        AND s.rejection_long_text IS NOT NULL
      UNION ALL
      SELECT
        sub.shop_name AS "shopName",
        sub.rejection_long_text AS "rejectionLongText"
      FROM submissions sub
      WHERE sub.status = 'rejected'
        AND sub.rejection_token IS NOT NULL
        AND sub.rejection_long_text IS NOT NULL
    )
    SELECT COUNT(*) AS total
    FROM rejected
    ${searchClause}
  `);

  return Number(row?.total ?? 0);
}

/**
 * Lists rejected shops and rejected submissions with public rejection pages.
 *
 * @param params.search - Optional shop-name search.
 * @param params.page - One-based page number.
 * @param params.pageSize - Numeric page size or `"all"`.
 * @returns Matching entries ordered by rejection date descending.
 */
export async function listPublicRejectedShops({
  search,
  page,
  pageSize,
  sortBy,
  sortDir,
}: PublicRejectedShopListParams) {
  const searchClause = publicRejectedShopSearchClause(search);
  const paginationClause =
    pageSize === "all" ? sql`` : sql`LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const sortColumn =
    sortBy === "shopName"
      ? sql`rejected."shopName"`
      : sortBy === "submittedAt"
        ? sql`rejected."submittedAt"`
        : sql`rejected."rejectedAt"`;
  const sortDirection = sortDir === "asc" ? sql`ASC` : sql`DESC`;

  return db.execute<PublicRejectedShopListRow & Record<string, unknown>>(sql`
    WITH rejected AS (
      SELECT
        'shop'::text AS source,
        s.id AS id,
        s.name AS "shopName",
        s.og_image AS "ogImage",
        s.logo_background_color AS "logoBackgroundColor",
        s.created_at AS "submittedAt",
        s.updated_at AS "rejectedAt",
        s.rejection_token AS "rejectionToken",
        s.rejection_long_text AS "rejectionLongText"
      FROM shops s
      WHERE s.visibility = 'rejected'
        AND s.rejection_token IS NOT NULL
        AND s.rejection_long_text IS NOT NULL
      UNION ALL
      SELECT
        'submission'::text AS source,
        sub.id AS id,
        sub.shop_name AS "shopName",
        sub.og_image AS "ogImage",
        sub.logo_background_color AS "logoBackgroundColor",
        sub.created_at AS "submittedAt",
        COALESCE(sub.reviewed_at, sub.updated_at) AS "rejectedAt",
        sub.rejection_token AS "rejectionToken",
        sub.rejection_long_text AS "rejectionLongText"
      FROM submissions sub
      WHERE sub.status = 'rejected'
        AND sub.rejection_token IS NOT NULL
        AND sub.rejection_long_text IS NOT NULL
    )
    SELECT
      rejected.source,
      rejected.id,
      rejected."shopName",
      rejected."ogImage",
      rejected."logoBackgroundColor",
      rejected."submittedAt",
      rejected."rejectedAt",
      rejected."rejectionToken"
    FROM rejected
    ${searchClause}
    ORDER BY ${sortColumn} ${sortDirection}, rejected."rejectedAt" DESC, rejected."shopName" ASC
    ${paginationClause}
  `);
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
        or(
          eq(contentPages.status, "published"),
          eq(contentPages.status, "hidden"),
          isNull(navItems.pageSlug),
        ),
      ),
    )
    .orderBy(asc(navItems.position));
}

/**
 * Lists all published and hidden content pages for static path generation.
 *
 * @returns Slug/title pairs for published and hidden pages.
 */
export async function listPublishedContentPages() {
  return db
    .select({ slug: contentPages.slug, title: contentPages.title })
    .from(contentPages)
    .where(or(eq(contentPages.status, "published"), eq(contentPages.status, "hidden")))
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
    .where(
      and(
        eq(contentPages.slug, slug),
        or(eq(contentPages.status, "published"), eq(contentPages.status, "hidden")),
      ),
    )
    .limit(1);

  return page ?? null;
}

/**
 * Returns rejection page data for a given token.
 *
 * Queries submissions first (status = "rejected"), then shops (visibility = "rejected").
 *
 * @param token - Rejection token from the public URL.
 * @returns `{ shopName, shopUrl, rejectionLongText, reviewedAt }` or `null` if not found.
 */
export async function getRejectionPageByToken(token: string) {
  const [[submissionRow], [shopRow]] = await Promise.all([
    db
      .select({
        shopName: submissions.shopName,
        shopUrl: submissions.shopUrl,
        rejectionLongText: submissions.rejectionLongText,
        reviewedAt: submissions.reviewedAt,
      })
      .from(submissions)
      .where(and(eq(submissions.rejectionToken, token), eq(submissions.status, "rejected")))
      .limit(1),
    db
      .select({
        shopName: shops.name,
        shopUrl: shops.url,
        rejectionLongText: shops.rejectionLongText,
        reviewedAt: shops.updatedAt,
      })
      .from(shops)
      .where(and(eq(shops.rejectionToken, token), eq(shops.visibility, "rejected")))
      .limit(1),
  ]);

  return submissionRow ?? shopRow ?? null;
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
 * Fetches a full public shop record by id, including categories.
 *
 * @param id - Shop id.
 * @returns Full shop row with aggregated categories, or `null`.
 */
export async function getFullPublicShopById(id: number) {
  const rows = await db.execute<
    CategoryShopRow & {
      categories: ShopCategory[];
      pickup: string;
      createdAt: string;
      updatedAt: string;
      likeCount: number;
    }
  >(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage",
           s.logo_background_color as "logoBackgroundColor",
           s.social_media as "socialMedia",
           s.payment_methods as "paymentMethods",
           s.like_count as "likeCount",
           s.created_at as "createdAt",
           s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.id = ${id} AND s.is_active = true AND s.visibility = 'public'
    GROUP BY s.id
  `);

  return rows[0] ?? null;
}

/**
 * Stores a dead-link report event.
 *
 * @param shopId - Reported shop id.
 * @param ipHash - Hashed source IP for throttling/abuse checks.
 * @param options.deduplicate - When `true` (the default), keeps at most one row per shop and hash.
 * @returns Resolves when report row is inserted.
 *
 * @remarks
 * Deduplication is only meaningful while the hash distinguishes reporters. The
 * caller turns it off when it does not, so a shared hash cannot reduce every
 * report for a shop to the first one.
 */
export async function insertDeadLinkReport(
  shopId: number,
  ipHash: string,
  options: { deduplicate?: boolean } = {},
): Promise<void> {
  if (options.deduplicate ?? true) {
    const [existing] = await db
      .select({ id: deadLinkReports.id })
      .from(deadLinkReports)
      .where(and(eq(deadLinkReports.shopId, shopId), eq(deadLinkReports.ipHash, ipHash)))
      .limit(1);

    if (existing) return;
  }

  await db.insert(deadLinkReports).values({ shopId, ipHash });
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

export type ShopLikeTransition = "liked" | "unliked" | "unchanged" | "not_found";

/**
 * Applies an idempotent like transition for one public shop and visitor.
 *
 * Counter changes are derived from inserting/deleting the `shop_likes` row so
 * repeated requests with the same desired state do not inflate or deflate counts.
 *
 * @param shopId - Shop id.
 * @param visitorKey - Server-derived anonymous visitor key.
 * @param liked - Desired like state.
 * @returns Transition result.
 */
export async function setShopLikeState(
  shopId: number,
  visitorKey: string,
  liked: boolean,
): Promise<ShopLikeTransition> {
  return db.transaction(async (tx) => {
    async function applyLikedState(): Promise<ShopLikeTransition> {
      const inserted = await tx
        .insert(shopLikes)
        .values({ shopId, visitorKey })
        .onConflictDoNothing()
        .returning({ shopId: shopLikes.shopId });

      const changed = inserted.length > 0;
      if (changed) {
        await tx
          .update(shops)
          .set({ likeCount: sql`like_count + 1` })
          .where(eq(shops.id, shopId));
      }

      return changed ? "liked" : "unchanged";
    }

    async function applyUnlikedState(): Promise<ShopLikeTransition> {
      const deleted = await tx
        .delete(shopLikes)
        .where(and(eq(shopLikes.shopId, shopId), eq(shopLikes.visitorKey, visitorKey)))
        .returning({ shopId: shopLikes.shopId });

      const changed = deleted.length > 0;
      if (changed) {
        await tx
          .update(shops)
          .set({ likeCount: sql`GREATEST(like_count - 1, 0)` })
          .where(eq(shops.id, shopId));
      }

      return changed ? "unliked" : "unchanged";
    }

    const [shop] = await tx
      .select({ id: shops.id })
      .from(shops)
      .where(and(eq(shops.id, shopId), eq(shops.visibility, "public")))
      .limit(1);

    return shop ? (liked ? applyLikedState() : applyUnlikedState()) : "not_found";
  });
}
