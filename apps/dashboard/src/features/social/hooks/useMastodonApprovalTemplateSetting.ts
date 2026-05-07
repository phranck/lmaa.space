import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SETTINGS_KEYS } from "@lmaa/shared";

import { api } from "@/lib/api.ts";

const SETTING_KEY = ["mastodon-approval-template-setting"] as const;

export function useMastodonApprovalTemplateSetting() {
  return useQuery({
    queryKey: SETTING_KEY,
    queryFn: () =>
      api.post<Record<string, string>>("/admin/settings/bulk", {
        keys: [SETTINGS_KEYS.MASTODON_APPROVAL_TEMPLATE_ID],
      }),
  });
}

export function useSaveMastodonApprovalTemplateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: number | undefined) =>
      api.put("/admin/settings", {
        key: SETTINGS_KEYS.MASTODON_APPROVAL_TEMPLATE_ID,
        value: templateId ? String(templateId) : "",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SETTING_KEY });
    },
  });
}
