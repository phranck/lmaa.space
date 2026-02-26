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

export type PublicNavId = "header" | "footer";

function normalizeShopHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export async function getManagedPublicCategories() {
  return listPublicCategoriesWithShopCount();
}

export async function getManagedPublicStats() {
  const shopCount = await countPublicShops();
  return { shopCount };
}

export async function getManagedPublicCategoryBySlug(slug: string) {
  const category = await getPublicCategoryBySlug(slug);
  if (!category) {
    return { ok: false as const, reason: "not_found" as const };
  }

  const categoryShops = await listPublicShopsByCategoryId(category.id);
  return { ok: true as const, data: { ...category, shops: categoryShops } };
}

export async function getManagedPublicShops() {
  const cached = getCacheEntry<PublicShopRow[]>(SHOPS_CACHE_KEY);
  if (cached) {
    return { cache: "HIT" as const, data: cached };
  }

  const data = await listAllPublicShopsWithCategories();
  setCacheEntry(SHOPS_CACHE_KEY, data, SHOPS_CACHE_TTL_MS);
  return { cache: "MISS" as const, data };
}

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

export async function getManagedPublicNav(navId: PublicNavId) {
  return listPublicNavItems(navId);
}

export async function getManagedPublishedContentList() {
  return listPublishedContentPages();
}

export async function getManagedPublishedContentPage(slug: string) {
  return getPublishedContentPageBySlug(slug);
}

export async function createManagedDeadLinkReport(shopId: number, ip: string) {
  const shop = await getPublicShopById(shopId);
  if (!shop) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await insertDeadLinkReport(shopId, hashIp(ip));
  await countDeadLinkReportsForShop(shopId);

  return { ok: true as const, message: "Danke für deinen Hinweis!" };
}

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

export function getManagedPublicCacheStats() {
  if (env.NODE_ENV !== "development") {
    return { ok: false as const };
  }

  return { ok: true as const, data: getCacheStats() };
}
