import { env } from "../config/env.js";

const UMAMI_URL = env.UMAMI_URL;
const UMAMI_USERNAME = env.UMAMI_USERNAME;
const UMAMI_PASSWORD = env.UMAMI_PASSWORD;
export const UMAMI_WEBSITE_ID = env.UMAMI_WEBSITE_ID;

export const umamiConfigured =
  UMAMI_URL !== "" && UMAMI_USERNAME !== "" && UMAMI_PASSWORD !== "" && UMAMI_WEBSITE_ID !== "";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
  });

  if (!res.ok) throw new Error(`Umami auth failed: ${res.status}`);

  const { token } = (await res.json()) as { token: string };
  // Cache for 23h (tokens are valid for 24h by default)
  cachedToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

export async function umamiGet<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${UMAMI_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Umami request failed: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export type UmamiPeriod = "today" | "7d" | "30d" | "60d" | "90d";

const PERIOD_DAYS: Record<UmamiPeriod, number | null> = {
  today: null,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "90d": 90,
};

export function periodToRange(period: UmamiPeriod): { startAt: number; endAt: number } {
  const endAt = Date.now();

  if (period === "today") {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return { startAt: midnight.getTime(), endAt };
  }

  const days = PERIOD_DAYS[period] ?? 7;
  const startAt = new Date();
  startAt.setDate(startAt.getDate() - days);
  startAt.setHours(0, 0, 0, 0);
  return { startAt: startAt.getTime(), endAt };
}

type UmamiKpiMetric = {
  value: number;
  change: number;
};

export type NormalizedUmamiStats = {
  pageviews: UmamiKpiMetric;
  visitors: UmamiKpiMetric;
  visits: UmamiKpiMetric;
  bounces: UmamiKpiMetric;
  totaltime: UmamiKpiMetric;
};

type MetricField = keyof NormalizedUmamiStats;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getMetricFromLegacyShape(
  source: Record<string, unknown>,
  field: MetricField,
): UmamiKpiMetric {
  const metric = source[field];
  if (!isRecord(metric)) return { value: 0, change: 0 };
  const value = toNumber(metric.value);
  const explicitChange = toNumber(metric.change);
  if (explicitChange !== 0) return { value, change: explicitChange };
  const prev = toNumber(metric.prev);
  return { value, change: toChange(value, prev) };
}

function getMetricFromCurrentShape(
  source: Record<string, unknown>,
  comparison: Record<string, unknown>,
  field: MetricField,
): UmamiKpiMetric {
  const value = toNumber(source[field]);
  const previous = toNumber(comparison[field]);
  return { value, change: toChange(value, previous) };
}

export function normalizeUmamiStats(raw: unknown): NormalizedUmamiStats {
  if (!isRecord(raw)) {
    return {
      pageviews: { value: 0, change: 0 },
      visitors: { value: 0, change: 0 },
      visits: { value: 0, change: 0 },
      bounces: { value: 0, change: 0 },
      totaltime: { value: 0, change: 0 },
    };
  }

  const comparison = isRecord(raw.comparison) ? raw.comparison : {};
  const hasCurrentShape = typeof raw.pageviews === "number";

  return {
    pageviews: hasCurrentShape
      ? getMetricFromCurrentShape(raw, comparison, "pageviews")
      : getMetricFromLegacyShape(raw, "pageviews"),
    visitors: hasCurrentShape
      ? getMetricFromCurrentShape(raw, comparison, "visitors")
      : getMetricFromLegacyShape(raw, "visitors"),
    visits: hasCurrentShape
      ? getMetricFromCurrentShape(raw, comparison, "visits")
      : getMetricFromLegacyShape(raw, "visits"),
    bounces: hasCurrentShape
      ? getMetricFromCurrentShape(raw, comparison, "bounces")
      : getMetricFromLegacyShape(raw, "bounces"),
    totaltime: hasCurrentShape
      ? getMetricFromCurrentShape(raw, comparison, "totaltime")
      : getMetricFromLegacyShape(raw, "totaltime"),
  };
}

const METRIC_TYPE_MAP: Record<string, string> = {
  url: "path",
};

export function normalizeUmamiMetricType(type: string): string {
  return METRIC_TYPE_MAP[type] ?? type;
}
