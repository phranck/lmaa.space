import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api.ts";

export const TEMPLATE_CHOICES_KEY = ["me-template-choices"] as const;

/**
 * Sticky template-per-account selections for the current admin user.
 * Returns a map: accountId -> templateId | null. Missing accounts default to "no post".
 */
export function useTemplateChoices() {
  return useQuery({
    queryKey: TEMPLATE_CHOICES_KEY,
    queryFn: () => api.get<Record<number, number | null>>("/admin/me/template-choices"),
  });
}
