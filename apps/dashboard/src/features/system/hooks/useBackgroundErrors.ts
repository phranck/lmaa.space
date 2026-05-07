import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api.ts";

/**
 * Client-side representation of a background_errors row.
 * Dates come back from the API as ISO strings.
 */
export interface BackgroundErrorRow {
  id: number;
  source: string;
  message: string;
  context: Record<string, unknown> | null;
  occurredAt: string;
  resolvedAt: string | null;
  resolvedBy: number | null;
}

const BACKGROUND_ERRORS_KEY = ["background-errors"];

export interface BackgroundErrorFilters {
  resolved?: boolean;
  source?: string;
}

/**
 * Loads background errors with optional filters.
 * Polls every 30 seconds for new unresolved errors.
 */
export function useBackgroundErrors(filters?: BackgroundErrorFilters) {
  const params = new URLSearchParams();
  if (filters?.resolved !== undefined) params.set("resolved", String(filters.resolved));
  if (filters?.source) params.set("source", filters.source);
  const qs = params.toString();

  return useQuery({
    queryKey: [...BACKGROUND_ERRORS_KEY, qs],
    queryFn: () =>
      api.get<BackgroundErrorRow[]>(`/admin/background-errors${qs ? `?${qs}` : ""}`),
    refetchInterval: 30_000,
  });
}

/**
 * Resolves a single background error by id.
 */
export function useResolveBackgroundError() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post<BackgroundErrorRow>(`/admin/background-errors/${id}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACKGROUND_ERRORS_KEY }),
  });
}
