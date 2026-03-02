import { api } from "@/lib/api.ts";
import type { AdminStats } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

/**
 * Loads core dashboard stats from backend.
 *
 * @returns React Query result containing admin counters.
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
}
