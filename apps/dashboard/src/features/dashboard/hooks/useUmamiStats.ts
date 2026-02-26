import { api } from "@/lib/api.ts";
import { useQuery } from "@tanstack/react-query";

export type UmamiPeriod = "today" | "7d" | "30d" | "60d" | "90d";
export type UmamiMetricType =
  | "url"
  | "referrer"
  | "browser"
  | "os"
  | "device"
  | "country"
  | "region"
  | "city";

export interface UmamiStats {
  pageviews: { value: number; change: number };
  visitors: { value: number; change: number };
  visits: { value: number; change: number };
  bounces: { value: number; change: number };
  totaltime: { value: number; change: number };
}

export interface UmamiPageviewPoint {
  x: string;
  y: number;
}

export interface UmamiPageviews {
  pageviews: UmamiPageviewPoint[];
  sessions: UmamiPageviewPoint[];
}

export interface UmamiMetricRow {
  x: string | null;
  y: number;
}

export interface UmamiRealtimeEvent {
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

export interface UmamiRealtime {
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

export interface UmamiActive {
  visitors: number;
}

export function useUmamiStats(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-stats", period],
    queryFn: () => api.get<UmamiStats | null>(`/admin/umami/stats?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiPageviews(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-pageviews", period],
    queryFn: () => api.get<UmamiPageviews | null>(`/admin/umami/pageviews?period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useUmamiRealtime() {
  return useQuery({
    queryKey: ["umami-realtime"],
    queryFn: () => api.get<UmamiRealtime | null>("/admin/umami/realtime"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useUmamiActive() {
  return useQuery({
    queryKey: ["umami-active"],
    queryFn: () => api.get<UmamiActive | null>("/admin/umami/active"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useUmamiMetrics(type: UmamiMetricType, period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-metrics", type, period],
    queryFn: () =>
      api.get<UmamiMetricRow[] | null>(`/admin/umami/metrics?type=${type}&period=${period}`),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}
