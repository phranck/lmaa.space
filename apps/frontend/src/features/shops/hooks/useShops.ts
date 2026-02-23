import type { Shop } from "@lmaa/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => api.get<Shop[]>("/shops"),
    staleTime: 5 * 60 * 1000,
  });
}
