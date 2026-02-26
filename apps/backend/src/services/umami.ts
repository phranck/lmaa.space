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
