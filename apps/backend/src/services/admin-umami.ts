import {
  UMAMI_WEBSITE_ID,
  type UmamiPeriod,
  normalizeUmamiMetricType,
  normalizeUmamiStats,
  periodToRange,
  umamiConfigured,
  umamiGet,
} from "./umami.js";

const DEFAULT_PERIOD: UmamiPeriod = "7d";

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

export async function getManagedUmamiStats(periodRaw: string | undefined) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);
  const { startAt, endAt } = periodToRange(period);

  try {
    const rawData = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`,
    );
    return normalizeUmamiStats(rawData);
  } catch {
    return null;
  }
}

export async function getManagedUmamiPageviews(periodRaw: string | undefined) {
  if (!umamiConfigured) return null;

  const period = normalizePeriod(periodRaw);
  const { startAt, endAt } = periodToRange(period);
  const unit = period === "today" ? "hour" : "day";

  try {
    return await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
    );
  } catch {
    return null;
  }
}

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
  } catch {
    return null;
  }
}

export async function getManagedUmamiActive() {
  if (!umamiConfigured) return null;

  try {
    return await umamiGet(`/websites/${UMAMI_WEBSITE_ID}/active`);
  } catch {
    return null;
  }
}

export async function getManagedUmamiRealtime() {
  if (!umamiConfigured) return null;

  try {
    return await umamiGet(`/realtime/${UMAMI_WEBSITE_ID}`);
  } catch {
    return null;
  }
}
