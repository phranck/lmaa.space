import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api.ts";

/**
 * Supported period filters for Umami analytics queries.
 */
export type UmamiPeriod = "today" | "7d" | "30d" | "60d" | "90d";
/**
 * Supported metric dimensions exposed by the backend Umami proxy.
 */
export type UmamiMetricType =
  | "url"
  | "referrer"
  | "browser"
  | "os"
  | "device"
  | "country"
  | "region"
  | "city";

interface UmamiStats {
  pageviews: { value: number; change: number };
  visitors: { value: number; change: number };
  visits: { value: number; change: number };
  bounces: { value: number; change: number };
  totaltime: { value: number; change: number };
}

interface UmamiPageviewPoint {
  x: string;
  y: number;
}

interface UmamiPageviews {
  pageviews: UmamiPageviewPoint[];
  sessions: UmamiPageviewPoint[];
}

interface UmamiMetricRow {
  x: string | null;
  y: number;
}

export interface UmamiEventValueRow {
  value: string;
  total: number;
}

export interface UmamiEventTotal {
  total: number;
}

interface UmamiRealtimeEvent {
  __type: string;
  sessionId: string;
  eventName: string;
  createdAt: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  urlPath: string;
  referrerDomain: string;
}

interface UmamiRealtime {
  countries: Record<string, number>;
  urls: Record<string, number>;
  referrers: Record<string, number>;
  events: UmamiRealtimeEvent[];
  series: {
    // Umami v2 uses "pageviews", older versions use "views" — support both
    // x may be a Unix timestamp (seconds/ms) or an ISO string depending on version
    pageviews?: { x: number | string; y: number }[];
    views?: { x: number | string; y: number }[];
    visitors: { x: number | string; y: number }[];
  };
  totals: {
    // same dual-name issue in totals
    pageviews?: number;
    views?: number;
    visitors: number;
    events: number;
    countries?: number;
  };
  timestamp: number;
}

interface UmamiActive {
  visitors: number;
}

/**
 * Loads KPI stats from Umami for the selected period.
 *
 * @param period - Relative period filter.
 * @returns React Query result with Umami KPI payload.
 */
export function useUmamiStats(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-stats", period],
    queryFn: () => api.get<UmamiStats | null>(`/admin/umami/stats?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

/**
 * Loads time-series pageview/session data for charts.
 *
 * @param period - Relative period filter.
 * @returns React Query result with chart points.
 */
export function useUmamiPageviews(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-pageviews", period],
    queryFn: () => api.get<UmamiPageviews | null>(`/admin/umami/pageviews?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

/**
 * Loads near-realtime analytics snapshot.
 *
 * @returns React Query result refreshed every 30 seconds.
 */
export function useUmamiRealtime() {
  return useQuery({
    queryKey: ["umami-realtime"],
    queryFn: () => api.get<UmamiRealtime | null>("/admin/umami/realtime"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

/**
 * Loads currently active visitors count.
 *
 * @returns React Query result refreshed every 30 seconds.
 */
export function useUmamiActive() {
  return useQuery({
    queryKey: ["umami-active"],
    queryFn: () => api.get<UmamiActive | null>("/admin/umami/active"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

/**
 * Loads aggregated metric rows by dimension (browser/country/etc.).
 *
 * @param type - Metric dimension.
 * @param period - Relative period filter.
 * @returns React Query result with metric rows.
 */
export function useUmamiMetrics(type: UmamiMetricType, period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-metrics", type, period],
    queryFn: () =>
      api.get<UmamiMetricRow[] | null>(`/admin/umami/metrics?type=${type}&period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiSearchTerms(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "search-terms", period],
    queryFn: () =>
      api.get<UmamiEventValueRow[] | null>(`/admin/umami/events/search-terms?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiCategoryClicks(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "category-clicks", period],
    queryFn: () =>
      api.get<UmamiEventValueRow[] | null>(`/admin/umami/events/category-clicks?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiShopVisitClicks(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "shop-visits", period],
    queryFn: () =>
      api.get<UmamiEventValueRow[] | null>(`/admin/umami/events/shop-visits?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiShopVisitTotal(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "shop-visits-total", period],
    queryFn: () =>
      api.get<UmamiEventTotal | null>(`/admin/umami/events/shop-visits/total?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiSiteLinkClicks(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "site-links", period],
    queryFn: () =>
      api.get<UmamiEventValueRow[] | null>(`/admin/umami/events/site-links?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiInteractionTotal(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-events", "interaction-total", period],
    queryFn: () =>
      api.get<UmamiEventTotal | null>(`/admin/umami/events/interactions/total?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
