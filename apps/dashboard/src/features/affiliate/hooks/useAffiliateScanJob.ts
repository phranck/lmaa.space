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
  return useQuery({
    queryKey: ["affiliate-job", jobId],
    queryFn: () => api.get<AffiliateScanJob>(`/admin/affiliate/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running" || status === "pending") return 3000;
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
