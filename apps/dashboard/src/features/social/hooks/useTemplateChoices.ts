import { useQuery } from "@tanstack/react-query";

import type { SocialMediaPostTemplateScope } from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

export const TEMPLATE_CHOICES_KEY = (scope: SocialMediaPostTemplateScope) =>
  ["me-template-choices", scope] as const;

/**
 * Sticky template-per-account selections for the current admin user, scoped per
 * dialog (submission approval vs. category creation).
 */
export function useTemplateChoices(scope: SocialMediaPostTemplateScope) {
  return useQuery({
    queryKey: TEMPLATE_CHOICES_KEY(scope),
    queryFn: () =>
      api.get<Record<number, number | null>>(`/admin/me/template-choices?scope=${scope}`),
  });
}
