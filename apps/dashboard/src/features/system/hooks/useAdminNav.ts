import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NavId, NavItem } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

/**
 * Loads editable nav items for one nav area.
 *
 * @param navId - Navigation id (`header` or `footer`).
 * @returns React Query result with nav rows.
 */
export function useAdminNav(navId: NavId) {
  return useQuery({
    queryKey: ["admin-nav", navId],
    queryFn: () => api.get<NavItem[]>(`/admin/nav/${navId}`),
  });
}

/**
 * Persists a full replacement set of nav items.
 *
 * @param navId - Navigation id (`header` or `footer`).
 * @returns React Query mutation that updates and invalidates nav queries.
 */
export function useSaveNav(navId: NavId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      items: {
        pageSlug?: string | null;
        url?: string | null;
        label?: string | null;
        target?: string;
      }[],
    ) => api.put<NavItem[]>(`/admin/nav/${navId}`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-nav", navId] });
      qc.invalidateQueries({ queryKey: ["nav", navId] });
    },
  });
}
