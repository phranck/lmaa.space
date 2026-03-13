import { createHmac } from "node:crypto";

import { getDomain } from "tldts";

import { env } from "../config/env.js";
import { failure, success } from "../lib/result.js";
import {
  SHOPS_CACHE_KEY,
  getCacheEntry,
  getCacheStats,
  setCacheEntry,
} from "../middleware/cache.js";
import {
  type PublicShopRow,
  countPublicShops,
  findShopByDomain,
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

const SHOPS_CACHE_TTL_MS = 60 * 1000;

export function normalizeShopHostname(url: string): string | null {
  const input = url.includes("://") ? url : `https://${url}`;
  return getDomain(input) ?? null;
}

export function hashIp(ip: string): string {
  return createHmac("sha256", env.IP_HASH_SALT).update(ip).digest("hex");
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
    return failure("not_found");
  }

  const categoryShops = await listPublicShopsByCategoryId(category.id);
  return success({ data: { ...category, shops: categoryShops } });
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
 * Validates whether a shop URL is available for submission.
 *
 * @param urlRaw - Raw URL string from form input.
 * @returns Validation result with status and optional metadata.
 */
export async function validateShopUrl(urlRaw: string | undefined) {
  const url = urlRaw?.trim();
  if (!url) {
    return { status: "available" as const };
  }

  const domain = normalizeShopHostname(url);
  if (!domain) {
    return { status: "available" as const };
  }

  const match = await findShopByDomain(domain);
  if (!match) {
    return { status: "available" as const };
  }

  if (match.visibility === "rejected") {
    const rejectionUrl = match.rejectionToken ? `/rejected/${match.rejectionToken}` : null;
    return {
      status: "rejected" as const,
      shopName: match.name,
      rejectionUrl,
    };
  }

  return {
    status: "published" as const,
    shopName: match.name,
  };
}

/**
 * Creates a dead-link report for a shop.
 *
 * @param shopId - Public shop id.
 * @param ip - Request IP (hashed before persistence).
 * @returns
 * - `{ ok: false, reason: "not_found" }` when shop does not exist.
 * - `{ ok: true }` when report is stored.
 */
export async function createManagedDeadLinkReport(shopId: number, ip: string) {
  const shop = await getPublicShopById(shopId);
  if (!shop) {
    return failure("not_found");
  }

  await insertDeadLinkReport(shopId, hashIp(ip));
  return success();
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
 * - `{ ok: true }` when concern is stored.
 */
export async function createManagedShopConcernReport(
  shopId: number,
  reasonRaw: string,
  ip: string,
) {
  const reason = reasonRaw.trim();
  if (reason.length < 10) {
    return failure("invalid_reason");
  }

  const shop = await getPublicShopById(shopId);
  if (!shop) {
    return failure("not_found");
  }

  await insertShopConcernReport(shopId, reason, hashIp(ip));
  return success();
}

/**
 * Returns cache diagnostics in development mode.
 *
 * @returns
 * - `{ ok: false, reason: "not_available" }` outside development.
 * - `{ ok: true, data }` with cache internals in development.
 */
export function getManagedPublicCacheStats() {
  if (env.NODE_ENV !== "development") {
    return failure("not_available");
  }

  return success({ data: getCacheStats() });
}

export async function getManagedPublicCategories() {
  return listPublicCategoriesWithShopCount();
}

export async function getManagedPublicNavItems(navId: "header" | "footer") {
  return listPublicNavItems(navId);
}

export async function getManagedPublicContentPages() {
  return listPublishedContentPages();
}

export async function getManagedPublicContentPageBySlug(slug: string) {
  return getPublishedContentPageBySlug(slug);
}

export async function getManagedPublicRejectionPageByToken(token: string) {
  return getRejectionPageByToken(token);
}
