import type { SubmissionStatus } from "@lmaa/shared";

export type SuggestionsStatusFilter = Extract<SubmissionStatus, "pending" | "onhold" | "rejected">;

const SUGGESTIONS_STATUS_FILTERS = new Set<SuggestionsStatusFilter>([
  "pending",
  "onhold",
  "rejected",
]);

/**
 * Parses the supported submission status filter values.
 *
 * @param value - Raw status value from URL params or localStorage.
 * @returns Valid suggestions filter status or null.
 */
export function parseSuggestionsStatusFilter(
  value: string | null | undefined,
): SuggestionsStatusFilter | null {
  if (!value) return null;
  return SUGGESTIONS_STATUS_FILTERS.has(value as SuggestionsStatusFilter)
    ? (value as SuggestionsStatusFilter)
    : null;
}

/**
 * Reads the persisted suggestions status filter.
 *
 * @param storageKey - localStorage key.
 * @returns Stored filter status or null when absent/invalid.
 */
export function readStoredSuggestionsStatusFilter(
  storageKey: string,
): SuggestionsStatusFilter | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = parseSuggestionsStatusFilter(window.localStorage.getItem(storageKey));
    if (!stored) {
      window.localStorage.removeItem(storageKey);
    }
    return stored;
  } catch {
    return null;
  }
}

/**
 * Persists the suggestions status filter.
 *
 * @param storageKey - localStorage key.
 * @param status - Selected filter status.
 */
export function writeStoredSuggestionsStatusFilter(
  storageKey: string,
  status: SuggestionsStatusFilter,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, status);
  } catch {}
}

/**
 * Applies a suggestions status filter to route query params.
 *
 * Keeps the default `pending` state out of the URL while preserving unrelated
 * params like table sorting.
 *
 * @param searchParams - Current route search parameters.
 * @param status - Selected filter status.
 * @returns New URLSearchParams instance with the status applied.
 */
export function applySuggestionsStatusFilterSearchParam(
  searchParams: URLSearchParams,
  status: SuggestionsStatusFilter,
) {
  const nextParams = new URLSearchParams(searchParams);
  if (status === "pending") {
    nextParams.delete("status");
  } else {
    nextParams.set("status", status);
  }
  return nextParams;
}
