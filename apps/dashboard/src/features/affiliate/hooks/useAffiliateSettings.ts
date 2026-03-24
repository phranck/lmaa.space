import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AFFILIATE_SETTINGS_KEYS } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const SETTINGS_KEY = ["affiliate-settings"];

export function useAffiliateSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      api.post<Record<string, string>>("/admin/settings/bulk", {
        keys: [...AFFILIATE_SETTINGS_KEYS],
      }),
  });
}

export function useSaveAffiliateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put("/admin/settings", { key, value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
