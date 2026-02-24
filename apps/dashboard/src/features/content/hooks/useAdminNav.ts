import { api } from "@/lib/api.ts";
import type { NavId, NavItem } from "@lmaa/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminNav(navId: NavId) {
  return useQuery({
    queryKey: ["admin-nav", navId],
    queryFn: () => api.get<NavItem[]>(`/admin/nav/${navId}`),
  });
}

export function useSaveNav(navId: NavId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      items: { pageSlug?: string | null; url?: string | null; label?: string | null; target?: string }[],
    ) => api.put<NavItem[]>(`/admin/nav/${navId}`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nav", navId] });
      qc.invalidateQueries({ queryKey: ["nav", navId] });
    },
  });
}
