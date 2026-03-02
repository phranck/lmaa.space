import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { getCacheEntry, getCacheStats, setCacheEntry } from "../middleware/cache.js";
import {
  type PublicShopRow,
  addSubmissionCategoryLinks,
  countDeadLinkReportsForShop,
  countPublicShops,
  createPublicSubmission,
  findPublicShopByHostname,
  getPublicCategoryBySlug,
  getPublicShopById,
  getPublishedContentPageBySlug,
  getRejectionPageByToken,
  insertDeadLinkReport,
  insertShopConcernReport,
  listAllPublicShopsWithCategories,
  listPublicCategoriesWithShopCount,
  listPublicNavItems,
  listPublicShopsByCategoryId,
  listPublishedContentPages,
  searchPublicCategoriesByEscapedQuery,
  searchPublicShops,
} from "../repositories/public.js";

const SHOPS_CACHE_KEY = "shops:all";
const SHOPS_CACHE_TTL_MS = 60 * 1000;

/**
 * Public navigation buckets rendered on the website.
 */
export type PublicNavId = "header" | "footer";

function normalizeShopHostname(url: string): string | null {
  try {
    const parsed = url.includes("://") ? new URL(url) : new URL(`https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Returns all public categories with computed shop counts.
 *
 * @returns Category list for public catalog navigation.
 */
export async function getManagedPublicCategories() {
  return listPublicCategoriesWithShopCount();
}

/**
 * Returns website counters shown in public overview widgets.
 *
 * @returns Object with current public shop count.
 */
export async function getManagedPublicStats() {
  const shopCount = await countPublicShops();
  return { shopCount };
}

/**
 * Resolves one public category with its visible shops.
 *
 * @param slug - Category slug.
 * @returns
 * - `{ ok: false, reason: "not_found" }` if slug does not exist.
 * - `{ ok: true, data }` with category + `shops`.
 */
export async function getManagedPublicCategoryBySlug(slug: string) {
  const category = await getPublicCategoryBySlug(slug);
  if (!category) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const categoryShops = await listPublicShopsByCategoryId(category.id);
  return { ok: true as const, data: { ...category, shops: categoryShops } };
}

/**
 * Returns all public shops with categories, backed by short-lived in-memory cache.
 *
 * @returns `{ cache: "HIT" | "MISS", data }`.
 *
 * @remarks
 * Side effects:
 * - On cache miss, stores result in process-memory cache for `SHOPS_CACHE_TTL_MS`.
 */
export async function getManagedPublicShops() {
  const cached = getCacheEntry<PublicShopRow[]>(SHOPS_CACHE_KEY);
  if (cached) {
    return { cache: "HIT" as const, data: cached };
  }

  const data = await listAllPublicShopsWithCategories();
  setCacheEntry(SHOPS_CACHE_KEY, data, SHOPS_CACHE_TTL_MS);
  return { cache: "MISS" as const, data };
}

/**
 * Searches the public catalog across shops and categories.
 *
 * @param queryRaw - Raw `q` query string from request.
 * @returns Combined result with normalized query and total.
 */
export async function searchManagedPublicCatalog(queryRaw: string | undefined) {
  const query = queryRaw?.trim();
  if (!query || query.length < 2) {
    return { shops: [], categories: [], query: query ?? "", total: 0 };
  }

  const matchingShops = await searchPublicShops(query);
  const escapedQuery = query.toLowerCase().replace(/[%_\\]/g, "\\$&");
  const matchingCategories = await searchPublicCategoriesByEscapedQuery(escapedQuery);

  return {
    shops: matchingShops,
    categories: matchingCategories,
    query,
    total: matchingShops.length + matchingCategories.length,
  };
}

/**
 * Checks whether a shop URL already exists in catalog by hostname.
 *
 * @param urlRaw - Raw URL query parameter.
 * @returns
 * - `{ exists: false }` for empty/invalid/non-matching URL.
 * - `{ exists: true, shop }` when hostname match is found.
 */
export async function checkManagedPublicShopUrl(urlRaw: string | undefined) {
  const url = urlRaw?.trim();
  if (!url) {
    return { exists: false as const };
  }

  const hostname = normalizeShopHostname(url);
  if (!hostname) {
    return { exists: false as const };
  }

  const match = await findPublicShopByHostname(hostname);
  if (!match) {
    return { exists: false as const };
  }

  return {
    exists: true as const,
    shop: { id: match.id, name: match.name, categories: match.categories },
  };
}

/**
 * Input contract for creating a public shop submission.
 */
export interface CreateManagedPublicSubmissionInput {
  shopName: string;
  shopUrl: string;
  categoryIds: number[];
  categorySuggestion?: string;
  region: string[];
  shipping?: string;
  description?: string;
  submitterEmail?: string;
  submitterNote?: string;
}

/**
 * Persists a public submission and linked categories.
 *
 * @param input - Validated submission payload.
 * @returns Success message for user-facing confirmation.
 *
 * @remarks
 * Side effects:
 * - Creates one submission row.
 * - Creates submission-category relation rows.
 */
export async function createManagedPublicSubmission(input: CreateManagedPublicSubmissionInput) {
  const submissionId = await createPublicSubmission({
    shopName: input.shopName,
    shopUrl: input.shopUrl,
    categorySuggestion: input.categorySuggestion ?? null,
    region: input.region,
    shipping: input.shipping ?? "",
    description: input.description ?? "",
    submitterEmail: input.submitterEmail ?? null,
    submitterNote: input.submitterNote ?? null,
  });

  await addSubmissionCategoryLinks(submissionId, input.categoryIds);

  return { message: "Vorschlag eingereicht" };
}

/**
 * Returns navigation items for one public navigation bucket.
 *
 * @param navId - `"header"` or `"footer"`.
 * @returns Ordered list of navigation items.
 */
export async function getManagedPublicNav(navId: PublicNavId) {
  return listPublicNavItems(navId);
}

/**
 * Returns metadata list of all published content pages.
 *
 * @returns Published content list used for page index/SSG selection.
 */
export async function getManagedPublishedContentList() {
  return listPublishedContentPages();
}

/**
 * Returns one published content page by slug.
 *
 * @param slug - Content page slug.
 * @returns Published page payload or `null`.
 */
export async function getManagedPublishedContentPage(slug: string) {
  return getPublishedContentPageBySlug(slug);
}

/**
 * Returns public rejection page data for a rejected submission.
 *
 * @param id - Submission id.
 * @returns Page data or `null` when not found or not rejected.
 */
export async function getManagedPublicRejectionPage(token: string) {
  return getRejectionPageByToken(token);
}

/**
 * Creates a dead-link report for a shop.
 *
 * @param shopId - Public shop id.
 * @param ip - Request IP (hashed before persistence).
 * @returns
 * - `{ ok: false, reason: "not_found" }` when shop does not exist.
 * - `{ ok: true, message }` when report is stored.
 *
 * @remarks
 * Side effects:
 * - Stores hashed reporter IP.
 * - Increments/updates dead-link counters.
 */
export async function createManagedDeadLinkReport(shopId: number, ip: string) {
  const shop = await getPublicShopById(shopId);
  if (!shop) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await insertDeadLinkReport(shopId, hashIp(ip));
  await countDeadLinkReportsForShop(shopId);

  return { ok: true as const, message: "Danke für deinen Hinweis!" };
}

/**
 * Creates a shop concern report with minimal reason validation.
 *
 * @param shopId - Public shop id.
 * @param reasonRaw - User-provided free-form reason text.
 * @param ip - Request IP (hashed before persistence).
 * @returns
 * - `{ ok: false, reason: "invalid_reason" }` if reason is too short.
 * - `{ ok: false, reason: "not_found" }` if shop does not exist.
 * - `{ ok: true, message }` when concern is stored.
 */
export async function createManagedShopConcernReport(
  shopId: number,
  reasonRaw: string,
  ip: string,
) {
  const reason = reasonRaw.trim();
  if (reason.length < 10) {
    return { ok: false as const, reason: "invalid_reason" as const };
  }

  const shop = await getPublicShopById(shopId);
  if (!shop) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await insertShopConcernReport(shopId, reason, hashIp(ip));
  return { ok: true as const, message: "Danke für dein Feedback!" };
}

/**
 * Returns cache diagnostics in development mode.
 *
 * @returns
 * - `{ ok: false }` outside development.
 * - `{ ok: true, data }` with cache internals in development.
 */
export function getManagedPublicCacheStats() {
  if (env.NODE_ENV !== "development") {
    return { ok: false as const };
  }

  return { ok: true as const, data: getCacheStats() };
}
