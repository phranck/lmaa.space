import { api } from "@/lib/api.ts";
import { useQuery } from "@tanstack/react-query";

export type UmamiPeriod = "today" | "7d" | "30d" | "60d" | "90d";
export type UmamiMetricType = "url" | "country" | "referrer";

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
  x: string;
  y: number;
}

export function useUmamiStats(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-stats", period],
    queryFn: () => api.get<UmamiStats | null>(`/admin/umami/stats?period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUmamiPageviews(period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-pageviews", period],
    queryFn: () => api.get<UmamiPageviews | null>(`/admin/umami/pageviews?period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUmamiMetrics(type: UmamiMetricType, period: UmamiPeriod) {
  return useQuery({
    queryKey: ["umami-metrics", type, period],
    queryFn: () =>
      api.get<UmamiMetricRow[] | null>(`/admin/umami/metrics?type=${type}&period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}
