import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AffiliateScanResult,
  AffiliateScanStats,
  AffiliateTrackingStatus,
} from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const SCANS_KEY = ["affiliate-scans"];
const STATS_KEY = ["affiliate-stats"];

export function useAffiliateScans(filters?: {
  status?: string;
  tracking?: string;
  network?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tracking) params.set("tracking", filters.tracking);
  if (filters?.network) params.set("network", filters.network);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();

  return useQuery({
    queryKey: [...SCANS_KEY, qs],
    queryFn: () =>
      api.get<AffiliateScanResult[]>(`/admin/affiliate/scans${qs ? `?${qs}` : ""}`),
  });
}

export function useAffiliateStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => api.get<AffiliateScanStats>("/admin/affiliate/stats"),
  });
}

export function useAffiliateHealth() {
  return useQuery({
    queryKey: ["affiliate-health"],
    queryFn: () => api.get<{ available: boolean }>("/admin/affiliate/health"),
    refetchInterval: 30_000,
  });
}

export function useUpdateAffiliateTracking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopId,
      trackingStatus,
      trackingNote,
    }: {
      shopId: number;
      trackingStatus: AffiliateTrackingStatus;
      trackingNote?: string | null;
    }) =>
      api.patch(`/admin/affiliate/scans/${shopId}/tracking`, {
        trackingStatus,
        trackingNote,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCANS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useDeleteAffiliateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => api.delete(`/admin/affiliate/scans/${shopId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCANS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useDeleteAllAffiliateScans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/admin/affiliate/scans"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCANS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useSingleAffiliateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) =>
      api.post<AffiliateScanResult>(`/admin/affiliate/scan/${shopId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCANS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useImportAffiliateScans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown[]) =>
      api.post<{ imported: number; skipped: number }>("/admin/affiliate/import", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCANS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useExportAffiliateScans() {
  return useQuery({
    queryKey: ["affiliate-export"],
    queryFn: () => api.get<unknown[]>("/admin/affiliate/export"),
    enabled: false,
  });
}
