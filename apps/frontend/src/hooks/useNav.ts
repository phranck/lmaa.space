import { api } from "@/lib/api.ts";
import type { NavItem } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";

export function useNav(navId: "header" | "footer") {
  return useQuery({
    queryKey: ["nav", navId],
    queryFn: () => api.get<NavItem[]>(`/nav/${navId}`),
    staleTime: 5 * 60 * 1000,
  });
}
