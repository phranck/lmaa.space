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

export type CategoryShopRow = Pick<
  Shop,
  "id" | "name" | "url" | "region" | "pickup" | "shipping" | "description" | "ogImage"
>;
export type PublicShopRow = CategoryShopRow & { categories: ShopCategory[] };
export type SearchShopRow = Shop & { categories: ShopCategory[]; rank: number };
export interface CheckUrlRow {
  id: number;
  name: string;
  categories: ShopCategory[];
}

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

export async function countPublicShops(): Promise<number> {
  const [row] = await db
    .select({ total: count(shops.id) })
    .from(shops)
    .where(and(eq(shops.isActive, true), eq(shops.visibility, "public")));
  return row?.total ?? 0;
}

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

export async function searchPublicShops(query: string) {
  return db.execute<SearchShopRow & Record<string, unknown>>(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories,
           ts_rank(s.search_vector, websearch_to_tsquery('german', ${query})) as rank
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.search_vector @@ websearch_to_tsquery('german', ${query})
      AND s.is_active = true AND s.visibility = 'public'
    GROUP BY s.id
    ORDER BY rank DESC
    LIMIT 20
  `);
}

export async function searchPublicCategoriesByEscapedQuery(escapedQuery: string) {
  return db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) LIKE ${`%${escapedQuery}%`} ESCAPE '\\'`)
    .limit(5);
}

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
    WHERE s.is_active = true AND s.visibility = 'public'
      AND replace(split_part(split_part(s.url, '://', 2), '/', 1), 'www.', '') = ${hostname}
    GROUP BY s.id
    LIMIT 1
  `);

  return row ?? null;
}

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

export async function createPublicSubmission(input: CreatePublicSubmissionInput): Promise<number> {
  const [submission] = await db.insert(submissions).values(input).returning({ id: submissions.id });
  return submission.id;
}

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

export async function listPublishedContentPages() {
  return db
    .select({ slug: contentPages.slug, title: contentPages.title })
    .from(contentPages)
    .where(eq(contentPages.status, "published"))
    .orderBy(contentPages.slug);
}

export async function getPublishedContentPageBySlug(slug: string) {
  const [page] = await db
    .select()
    .from(contentPages)
    .where(and(eq(contentPages.slug, slug), eq(contentPages.status, "published")))
    .limit(1);

  return page ?? null;
}

export async function getPublicShopById(id: number) {
  const [shop] = await db
    .select({ id: shops.id, name: shops.name, url: shops.url })
    .from(shops)
    .where(eq(shops.id, id))
    .limit(1);

  return shop ?? null;
}

export async function insertDeadLinkReport(shopId: number, ipHash: string): Promise<void> {
  await db.insert(deadLinkReports).values({ shopId, ipHash });
}

export async function countDeadLinkReportsForShop(shopId: number): Promise<number> {
  const [row] = await db
    .select({ reportCount: count(deadLinkReports.id) })
    .from(deadLinkReports)
    .where(eq(deadLinkReports.shopId, shopId));
  return row?.reportCount ?? 0;
}

export async function insertShopConcernReport(
  shopId: number,
  reason: string,
  ipHash: string,
): Promise<void> {
  await db.insert(shopConcernReports).values({ shopId, reason, ipHash });
}
