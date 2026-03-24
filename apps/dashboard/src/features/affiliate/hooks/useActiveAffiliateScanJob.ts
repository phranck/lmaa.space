import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { AffiliateScanJob } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Polls for the currently active batch scan job.
 * Shared between AffiliateListPage (progress bar) and Sidebar (live badge).
 * Automatically refreshes scans + stats while a job is running.
 */
export function useActiveAffiliateScanJob() {
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["affiliate-job-active"],
    queryFn: async () => {
      const data = await api.get<AffiliateScanJob | null>("/admin/affiliate/jobs/active");
      if (data) {
        qc.invalidateQueries({ queryKey: ["affiliate-scans"] });
        qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
      }
      return data;
    },
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && (job.status === "running" || job.status === "pending")) return 2000;
      return false;
    },
  });
}
