import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AffiliateScanJob } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

export function useStartBatchScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopIds?: number[]) =>
      api.post<AffiliateScanJob>("/admin/affiliate/scan", { shopIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-scans"] });
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
    },
  });
}

export function useAffiliateScanJob(jobId: number | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["affiliate-job", jobId],
    queryFn: async () => {
      const data = await api.get<AffiliateScanJob>(`/admin/affiliate/jobs/${jobId}`);
      // Refresh scans + stats while batch is running
      qc.invalidateQueries({ queryKey: ["affiliate-scans"] });
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
      return data;
    },
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running" || status === "pending") return 2000;
      return false;
    },
  });
}

export function useCancelBatchScan() {
  return useMutation({
    mutationFn: (jobId: number) =>
      api.post(`/admin/affiliate/jobs/${jobId}/cancel`),
  });
}
