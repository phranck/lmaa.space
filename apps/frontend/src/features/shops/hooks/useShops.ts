import { useQuery } from "@tanstack/react-query";
import type { Shop } from "@dein-shop/shared";
import { api } from "../../../lib/api.ts";

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => api.get<Shop[]>("/shops"),
    staleTime: 5 * 60 * 1000,
  });
}
