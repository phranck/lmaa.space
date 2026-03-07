import {
  UMAMI_WEBSITE_ID,
  type UmamiPeriod,
  normalizeUmamiMetricType,
  normalizeUmamiStats,
  periodToRange,
  umamiConfigured,
  umamiGet,
} from "./umami.js";
import { logger } from "../lib/logger.js";

const DEFAULT_PERIOD: UmamiPeriod = "7d";
const EVENT_REPORT_LIMIT = 10;

type ManagedUmamiEventName =
  | "site-search"
  | "category-click"
  | "shop-visit-click"
  | "site-link-click";

interface UmamiEventValueRow {
  value: string;
  total: number;
}

interface UmamiEventTotal {
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeEventValueRows(raw: unknown): UmamiEventValueRow[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!isRecord(entry)) return null;

      const value = toText(entry.x ?? entry.value).trim();
      const total = toNumber(entry.y ?? entry.total);
      if (value === "" || total <= 0) return null;

      return { value, total };
    })
    .filter((row): row is UmamiEventValueRow => row !== null);
}

function extractEventPropertyTotal(raw: unknown, propertyName: string): number {
  if (!Array.isArray(raw)) return 0;

  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    if (toText(entry.propertyName) !== propertyName) continue;
    return toNumber(entry.total);
  }

  return 0;
}

function buildEventValuePath(
  eventName: ManagedUmamiEventName,
  propertyName: string,
  period: UmamiPeriod,
) {
  const { startAt, endAt } = periodToRange(period);
  const params = new URLSearchParams({
    startAt: String(startAt),
    endAt: String(endAt),
    event: eventName,
    propertyName,
    limit: String(EVENT_REPORT_LIMIT),
  });
  return `/websites/${UMAMI_WEBSITE_ID}/event-data/values?${params.toString()}`;
}

function buildEventPropertiesPath(eventName: ManagedUmamiEventName, period: UmamiPeriod) {
  const { startAt, endAt } = periodToRange(period);
  const params = new URLSearchParams({
    startAt: String(startAt),
    endAt: String(endAt),
    event: eventName,
  });
  return `/websites/${UMAMI_WEBSITE_ID}/event-data/events?${params.toString()}`;
}

function normalizePeriod(period: string | undefined): UmamiPeriod {
  switch (period) {
    case "today":
    case "7d":
    case "30d":
    case "60d":
    case "90d":
      return period;
    default:
      return DEFAULT_PERIOD;
  }
}

async function getManagedUmamiEventValues(
  eventName: ManagedUmamiEventName,
  propertyName: string,
  periodRaw: string | undefined,
) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);

  try {
    const rawData = await umamiGet(buildEventValuePath(eventName, propertyName, period));
    return normalizeEventValueRows(rawData);
  } catch (error) {
    logger.error({ err: error, eventName, propertyName }, "umami event values request failed");
    return null;
  }
}

async function getManagedUmamiEventTotal(
  eventName: ManagedUmamiEventName,
  propertyName: string,
  periodRaw: string | undefined,
): Promise<UmamiEventTotal | null> {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);

  try {
    const rawData = await umamiGet(buildEventPropertiesPath(eventName, period));
    return { total: extractEventPropertyTotal(rawData, propertyName) };
  } catch (error) {
    logger.error({ err: error, eventName, propertyName }, "umami event total request failed");
    return null;
  }
}

/**
 * Returns normalized KPI stats from Umami for the requested period.
 *
 * @param periodRaw - Untrusted period query string.
 * @returns Normalized KPI payload or `null` when Umami is unavailable/fails.
 */
export async function getManagedUmamiStats(periodRaw: string | undefined) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);
  const { startAt, endAt } = periodToRange(period);

  try {
    const rawData = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`,
    );
    return normalizeUmamiStats(rawData);
  } catch (error) {
    logger.error({ err: error }, "umami request failed");
    return null;
  }
}

/**
 * Returns time-series pageview data from Umami for the requested period.
 *
 * @param periodRaw - Untrusted period query string.
 * @returns Umami pageview series payload or `null`.
 */
export async function getManagedUmamiPageviews(periodRaw: string | undefined) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);
  const { startAt, endAt } = periodToRange(period);
  const unit = period === "today" ? "hour" : "day";

  try {
    return await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
    );
  } catch (error) {
    logger.error({ err: error }, "umami request failed");
    return null;
  }
}

/**
 * Returns top metrics (pages/sources/devices etc.) from Umami.
 *
 * @param typeRaw - Metric type from query string.
 * @param periodRaw - Period preset from query string.
 * @returns Umami metric payload or `null`.
 */
export async function getManagedUmamiMetrics(
  typeRaw: string | undefined,
  periodRaw: string | undefined,
) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);
  const type = normalizeUmamiMetricType(typeRaw ?? "url");
  const { startAt, endAt } = periodToRange(period);

  try {
    return await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}&limit=10`,
    );
  } catch (error) {
    logger.error({ err: error }, "umami request failed");
    return null;
  }
}

/**
 * Returns currently active visitor count from Umami.
 *
 * @returns Active payload from Umami or `null`.
 */
export async function getManagedUmamiActive() {
  if (!umamiConfigured) return null;

  try {
    return await umamiGet(`/websites/${UMAMI_WEBSITE_ID}/active`);
  } catch (error) {
    logger.error({ err: error }, "umami request failed");
    return null;
  }
}

/**
 * Returns realtime payload from Umami.
 *
 * @returns Realtime payload from Umami or `null`.
 */
export async function getManagedUmamiRealtime() {
  if (!umamiConfigured) return null;

  try {
    return await umamiGet(`/realtime/${UMAMI_WEBSITE_ID}`);
  } catch (error) {
    logger.error({ err: error }, "umami request failed");
    return null;
  }
}

export async function getManagedUmamiSearchTerms(periodRaw: string | undefined) {
  return getManagedUmamiEventValues("site-search", "query", periodRaw);
}

export async function getManagedUmamiCategoryClicks(periodRaw: string | undefined) {
  return getManagedUmamiEventValues("category-click", "categoryName", periodRaw);
}

export async function getManagedUmamiShopVisitClicks(periodRaw: string | undefined) {
  return getManagedUmamiEventValues("shop-visit-click", "shopName", periodRaw);
}

export async function getManagedUmamiShopVisitTotal(periodRaw: string | undefined) {
  return getManagedUmamiEventTotal("shop-visit-click", "shopId", periodRaw);
}

export async function getManagedUmamiSiteLinkClicks(periodRaw: string | undefined) {
  return getManagedUmamiEventValues("site-link-click", "label", periodRaw);
}

export async function getManagedUmamiInteractionTotal(periodRaw: string | undefined) {
  if (!umamiConfigured) return null;

  try {
    const [searches, categories, shopVisits, siteLinks] = await Promise.all([
      getManagedUmamiEventTotal("site-search", "query", periodRaw),
      getManagedUmamiEventTotal("category-click", "categoryName", periodRaw),
      getManagedUmamiEventTotal("shop-visit-click", "shopId", periodRaw),
      getManagedUmamiEventTotal("site-link-click", "href", periodRaw),
    ]);

    return {
      total:
        (searches?.total ?? 0) +
        (categories?.total ?? 0) +
        (shopVisits?.total ?? 0) +
        (siteLinks?.total ?? 0),
    };
  } catch (error) {
    logger.error({ err: error }, "umami interaction total request failed");
    return null;
  }
}
