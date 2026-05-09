import { createHmac, timingSafeEqual } from "node:crypto";

import { getDomain } from "tldts";

import { encodeShopToken } from "@lmaa/shared";

import { env } from "../config/env.js";
import { extractEuropeanPostalCodePrefix } from "../lib/postal-code.js";
import { type Result, failure, success } from "../lib/result.js";
import type { ShopFilterParams } from "../lib/shop-filters.js";
import {
  SHOPS_CACHE_KEY,
  getCacheEntry,
  getCacheStats,
  setCacheEntry,
} from "../middleware/cache.js";
import { loadShopHeadquartersMap } from "../repositories/headquarters.js";
import {
  countFilteredPublicShops,
  listAvailableFilterCountries,
  listFilteredCategoriesWithCount,
  listFilteredPublicShops,
  listFilteredShopsByCategoryId,
  searchFilteredPublicShops,
} from "../repositories/public-filtered.js";
import {
  type PublicShopRow,
  countPendingSubmissions,
  countPublicShops,
  findPendingSubmissionByDomain,
  findRejectedSubmissionByDomain,
  findShopByDomain,
  getFullPublicShopById,
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
  setShopLikeState,
} from "../repositories/public.js";

const SHOPS_CACHE_TTL_MS = 60 * 1000;

/**
 * Extracts the registered domain from a shop URL for deduplication checks.
 *
 * @param url - Absolute or protocol-relative URL string.
 * @returns Registered domain (e.g. `"example.com"`), or `null` if not parseable.
 */
export function normalizeShopHostname(url: string): string | null {
  const input = url.includes("://") ? url : `https://${url}`;
  return getDomain(input) ?? null;
}

const AMAZON_STORE_DOMAINS = [
  "amazon.com",
  "amazon.ca",
  "amazon.com.mx",
  "amazon.com.br",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.com.tr",
  "amazon.com.be",
  "amazon.eg",
  "amazon.sa",
  "amazon.ae",
  "amazon.in",
  "amazon.com.au",
  "amazon.co.jp",
  "amazon.sg",
  "amazon.cn",
  "amazon.ie",
  "amzn.to",
  "amzn.eu",
  "amzn.com",
  "amzn.in",
  "amzn.de",
  "amzn.es",
  "amzn.fr",
  "amzn.it",
  "amzn.uk",
  "amzn.asia",
] as const;

const AMAZON_RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export function isAmazonStoreHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return AMAZON_STORE_DOMAINS.some((d) => lower === d || lower.endsWith(`.${d}`));
}

/**
 * One-way HMAC-SHA256 hash of an IP address using the configured `IP_HASH_SALT`.
 *
 * Used for anonymous rate-limiting and reporting without storing raw IPs.
 *
 * @param ip - Raw IP address string.
 * @returns Hex-encoded HMAC digest.
 */
export function hashIp(ip: string): string {
  return createHmac("sha256", env.IP_HASH_SALT).update(ip).digest("hex");
}

const LIKE_TOKEN_MAX_AGE_S = 30 * 60;

function deriveLikeVisitorKey(ip: string, fingerprint: string): string {
  return createHmac("sha256", env.IP_HASH_SALT)
    .update(`${hashIp(ip)}:${fingerprint.trim()}`)
    .digest("hex");
}

/**
 * Generates a stateless HMAC challenge token for the like endpoint.
 *
 * @param shopId - Shop id to bind the token to.
 * @returns Token string in format `hmac.timestamp`.
 */
function generateLikeToken(shopId: number): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${shopId}:${timestamp}`;
  const hmac = createHmac("sha256", env.IP_HASH_SALT).update(payload).digest("hex");
  return `${hmac}.${timestamp}`;
}

/**
 * Validates a like challenge token for a given shop.
 *
 * @param shopId - Expected shop id.
 * @param token - Token string from client.
 * @returns Validation result with reason on failure.
 */
function validateLikeToken(shopId: number, token: string): { valid: boolean; reason?: string } {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return { valid: false, reason: "invalid_format" };

  const hmac = token.slice(0, dotIndex);
  const timestampStr = token.slice(dotIndex + 1);
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return { valid: false, reason: "invalid_timestamp" };

  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > LIKE_TOKEN_MAX_AGE_S) return { valid: false, reason: "expired" };

  const payload = `${shopId}:${timestamp}`;
  const expected = createHmac("sha256", env.IP_HASH_SALT).update(payload).digest("hex");

  if (hmac.length !== expected.length) return { valid: false, reason: "invalid_hmac" };

  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "invalid_hmac" };

  return { valid: true };
}

/**
 * Validates the challenge token and toggles the like counter for a shop.
 *
 * @param shopId - Shop id.
 * @param liked - `true` to increment, `false` to decrement.
 * @param token - HMAC challenge token from the client.
 * @returns Result indicating success or typed failure reason.
 */
export async function toggleShopLike(
  shopId: number,
  liked: boolean,
  token: string,
  fingerprint: string,
  ip: string,
): Promise<Result<Record<string, never>, "invalid_token" | "expired_token" | "not_found">> {
  const tokenResult = validateLikeToken(shopId, token);
  if (!tokenResult.valid) {
    return failure(tokenResult.reason === "expired" ? "expired_token" : "invalid_token");
  }

  const visitorKey = deriveLikeVisitorKey(ip, fingerprint);
  const transition = await setShopLikeState(shopId, visitorKey, liked);

  if (transition === "not_found") return failure("not_found");
  return success();
}

/**
 * Returns website counters shown in public overview widgets.
 *
 * @returns Object with current public shop count and pending submission count.
 */
export async function getManagedPublicStats() {
  const [shopCount, pendingReviewCount] = await Promise.all([
    countPublicShops(),
    countPendingSubmissions(),
  ]);
  return { shopCount, pendingReviewCount };
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
  return success({
    data: {
      ...category,
      imageUrl: resolveCategoryImageUrl(category),
      shops: categoryShops,
    },
  });
}

/**
 * Resolves a full public shop by id, enriched with headquarters data.
 *
 * @param id - Shop id.
 * @returns
 * - `{ ok: false, reason: "not_found" }` when shop does not exist.
 * - `{ ok: true, data }` with the full shop payload.
 */
export async function getManagedPublicShopById(id: number) {
  const shop = await getFullPublicShopById(id);
  if (!shop) {
    return failure("not_found");
  }

  const hqMap = await loadShopHeadquartersMap([id]);

  return success({
    data: {
      ...shop,
      headquarters: hqMap.get(id) ?? null,
      likeToken: generateLikeToken(id),
    },
  });
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

  const postalCodePrefix = extractEuropeanPostalCodePrefix(query);
  const matchingShops = await searchPublicShops(query, { postalCodePrefix });
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
    return { status: "invalid" as const };
  }

  if (isAmazonStoreHostname(domain)) {
    return {
      status: "published" as const,
      shopName: "Amazon",
      shopUrl: AMAZON_RICKROLL_URL,
    };
  }

  const match = await findShopByDomain(domain);
  if (match) {
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
      shopUrl: `/shop/${encodeShopToken(match.id)}`,
    };
  }

  const submission = await findRejectedSubmissionByDomain(domain);
  if (submission) {
    const rejectionUrl = submission.rejectionToken ? `/rejected/${submission.rejectionToken}` : null;
    return {
      status: "rejected" as const,
      shopName: submission.shopName,
      rejectionUrl,
    };
  }

  const pending = await findPendingSubmissionByDomain(domain);
  if (pending) {
    return {
      status: "pending" as const,
      shopName: pending.shopName,
    };
  }

  return { status: "available" as const };
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

function resolveCategoryImageUrl(row: { imageUrl: string | null }): string | null {
  return row.imageUrl;
}

export async function getManagedPublicCategories() {
  const rows = await listPublicCategoriesWithShopCount();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: resolveCategoryImageUrl(row),
    imagePhotographer: row.imagePhotographer,
    imagePhotographerUrl: row.imagePhotographerUrl,
    imageFocalPointY: row.imageFocalPointY,
    shopCount: row.shopCount,
  }));
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

// ---------------------------------------------------------------------------
// Filtered public endpoints
// ---------------------------------------------------------------------------

export async function getFilteredPublicCategories(filters: ShopFilterParams) {
  const [rows, totalShops] = await Promise.all([
    listFilteredCategoriesWithCount(filters),
    countFilteredPublicShops(filters),
  ]);
  const categories = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: resolveCategoryImageUrl(row),
    imagePhotographer: row.imagePhotographer,
    imagePhotographerUrl: row.imagePhotographerUrl,
    imageFocalPointY: row.imageFocalPointY,
    shopCount: row.shopCount,
  }));
  return { categories, totalShops };
}

export async function getFilteredPublicCategoryBySlug(
  slug: string,
  filters: ShopFilterParams,
) {
  const category = await getPublicCategoryBySlug(slug);
  if (!category) {
    return failure("not_found");
  }

  const shops = await listFilteredShopsByCategoryId(category.id, filters);
  return success({
    data: {
      ...category,
      imageUrl: resolveCategoryImageUrl(category),
      shops,
    },
  });
}

export async function getFilteredPublicShops(filters: ShopFilterParams) {
  return listFilteredPublicShops(filters);
}

export async function searchFilteredPublicCatalog(
  queryRaw: string | undefined,
  filters: ShopFilterParams,
) {
  const query = queryRaw?.trim();
  if (!query || query.length < 2) {
    return { shops: [], categories: [], query: query ?? "", total: 0 };
  }

  const postalCodePrefix = extractEuropeanPostalCodePrefix(query);
  const matchingShops = await searchFilteredPublicShops(query, filters, { postalCodePrefix });
  const escapedQuery = query.toLowerCase().replace(/[%_\\]/g, "\\$&");
  const matchingCategories = await searchPublicCategoriesByEscapedQuery(escapedQuery);

  return {
    shops: matchingShops,
    categories: matchingCategories,
    query,
    total: matchingShops.length + matchingCategories.length,
  };
}

export async function getPublicFilterOptions() {
  const countries = await listAvailableFilterCountries();
  return { countries };
}
