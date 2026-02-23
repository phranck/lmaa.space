import { api } from "@/lib/api.ts";
import type { AdminStats } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

export function useAdminStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
}
