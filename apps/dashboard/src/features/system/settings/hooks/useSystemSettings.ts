import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { SYSTEM_SETTINGS_KEYS } from "@lmaa/shared";
import type { ReviewProviderName } from "@lmaa/shared";

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

/**
 * A model the automated review can be configured to run on.
 */
export interface ReviewModelOption {
  id: string;
  displayName: string;
  /** Reasoning efforts this model accepts, as the provider reports them. */
  efforts: string[];
}

/**
 * Loads the models the provider currently offers.
 *
 * @param provider - Provider whose models to list.
 * @returns The query, whose data is empty when no list could be fetched.
 *
 * @remarks
 * Kept for a session rather than refetched, because the list changes when a
 * model is released and not while somebody edits a form.
 *
 * Keyed by provider, so switching between them in the form shows the new
 * provider's models rather than the previous one's held answer.
 */
export function useReviewModels(provider: ReviewProviderName) {
  return useQuery({
    queryKey: ["review-models", provider] as const,
    queryFn: () =>
      api.get<ReviewModelOption[]>(
        `/admin/review/models?provider=${encodeURIComponent(provider)}`,
      ),
    staleTime: 60 * 60 * 1000,
  });
}
