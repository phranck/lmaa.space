import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SYSTEM_SETTINGS_KEYS } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const SETTINGS_KEY = ["system-settings"] as const;

export function useSystemSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () =>
      api.post<Record<string, string>>("/admin/settings/bulk", {
        keys: [...SYSTEM_SETTINGS_KEYS],
      }),
  });
}

export function useSaveSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.put("/admin/settings", { key, value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
