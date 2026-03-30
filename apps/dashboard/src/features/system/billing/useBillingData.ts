import { useQuery } from "@tanstack/react-query";

import type { BillingCostSummary, BillingStatus, BillingTimeline } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const STALE_TIME = 5 * 60 * 1000;

export function useBillingCosts() {
  return useQuery({
    queryKey: ["billing", "costs"],
    queryFn: () => api.get<BillingCostSummary>("/admin/billing/costs"),
    staleTime: STALE_TIME,
  });
}

export function useBillingTimeline(days = 30) {
  return useQuery({
    queryKey: ["billing", "timeline", days],
    queryFn: () => api.get<BillingTimeline>(`/admin/billing/timeline?days=${days}`),
    staleTime: STALE_TIME,
  });
}

export function useBillingStatus() {
  return useQuery({
    queryKey: ["billing", "status"],
    queryFn: () => api.get<BillingStatus>("/admin/billing/status"),
    staleTime: STALE_TIME,
  });
}
