import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { AffiliateScanJob } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Polls for the currently active batch scan job.
 * Shared between AffiliateListPage (progress bar) and Sidebar (live badge).
 * Invalidates scans + stats only when progress actually changes.
 */
export function useActiveAffiliateScanJob() {
  const qc = useQueryClient();
  const prevRef = useRef<{ status: string; completed: number } | null>(null);

  const query = useQuery({
    queryKey: ["affiliate-job-active"],
    queryFn: () => api.get<AffiliateScanJob | null>("/admin/affiliate/jobs/active"),
    refetchInterval: (q) => {
      const job = q.state.data;
      if (job && (job.status === "running" || job.status === "pending")) return 2000;
      return false;
    },
  });

  const job = query.data;
  useEffect(() => {
    const current = job
      ? { status: job.status, completed: job.completedShops }
      : null;
    const prev = prevRef.current;

    const changed =
      (current && !prev) ||
      (!current && prev) ||
      (current && prev && (current.status !== prev.status || current.completed !== prev.completed));

    if (changed) {
      qc.invalidateQueries({ queryKey: ["affiliate-scans"] });
      qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
    }
    prevRef.current = current;
  }, [job, qc]);

  return query;
}
