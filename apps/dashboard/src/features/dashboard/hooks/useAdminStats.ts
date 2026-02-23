import { api } from "@/lib/api.ts";
import { useQuery } from "@tanstack/react-query";

export interface AdminStats {
  shops: number;
  categories: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  deadLinkReports: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });
}
