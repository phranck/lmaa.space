import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Donation,
  DonationBreakdown,
  DonationInput,
  DonationOrigin,
  DonationTotals,
} from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

/** The ledger over one window, together with what that window adds up to. */
export interface DonationLedger {
  donations: Donation[];
  /** What the listed payments add up to, in cents. */
  rangeCents: number;
  /** How many payments are listed. */
  rangeCount: number;
}

/** The window a ledger is asked for. Either end may be left out. */
export interface DonationRangeFilter {
  from?: string;
  to?: string;
}

/** The window, and optionally one origin, which is what the list takes. */
export interface DonationListFilter extends DonationRangeFilter {
  /** Left out to list both origins together. */
  origin?: DonationOrigin;
}

/**
 * Every payment in a window, most recent first, with that window's sum.
 *
 * The list and the sum come from one request, so the total under the table can
 * never describe a different window from the rows above it. The sum ignores the
 * origin on purpose: it answers what came in over the period, and following the
 * filter would make its label wrong.
 *
 * @param filter - The days to include, both ends counting, and which origin.
 */
export function useDonations(filter: DonationListFilter = {}) {
  const query = new URLSearchParams();
  if (filter.from) query.set("from", filter.from);
  if (filter.to) query.set("to", filter.to);
  if (filter.origin) query.set("origin", filter.origin);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return useQuery({
    queryKey: ["donations", filter.from ?? "", filter.to ?? "", filter.origin ?? ""],
    queryFn: () => api.get<DonationLedger>(`/admin/donations${suffix}`),
    staleTime: 30 * 1000,
  });
}

/**
 * The ledger grouped into periods and payment routes, which is what a chart
 * draws.
 *
 * The window is the only thing sent. How wide a period is follows from it on
 * the server, and comes back on `bucket` so an axis can be labelled by day or
 * by month without the page working it out a second time.
 *
 * @param range - The days to include. Both ends count, and either may be left
 *   out, in which case the chart reaches as far as the ledger does.
 */
export function useDonationBreakdown(range: DonationRangeFilter = {}) {
  const query = new URLSearchParams();
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return useQuery({
    queryKey: ["donation-breakdown", range.from ?? "", range.to ?? ""],
    queryFn: () => api.get<DonationBreakdown>(`/admin/donations/breakdown${suffix}`),
    staleTime: 30 * 1000,
  });
}

/** What came in over the last 30 and the last 365 days. */
export function useDonationTotals() {
  return useQuery({
    queryKey: ["donation-totals"],
    queryFn: () => api.get<DonationTotals>("/admin/donations/totals"),
    staleTime: 30 * 1000,
  });
}

/**
 * Invalidates everything a changed payment shows up in.
 *
 * The ledger is cached per window, the figures above it are their own query,
 * and the chart page holds a third, so a saved payment has to reach all of
 * them. Held here rather than repeated in each mutation, because a mutation
 * written later would otherwise forget one.
 */
function useRefreshLedger() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["donations"] });
    void queryClient.invalidateQueries({ queryKey: ["donation-totals"] });
    void queryClient.invalidateQueries({ queryKey: ["donation-breakdown"] });
  };
}

/** Records a new payment. */
export function useCreateDonation() {
  const refresh = useRefreshLedger();
  return useMutation({
    mutationFn: (input: DonationInput) => api.post<Donation>("/admin/donations", input),
    onSuccess: refresh,
  });
}

/** Saves one payment. */
export function useSaveDonation() {
  const refresh = useRefreshLedger();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DonationInput }) =>
      api.put<Donation>(`/admin/donations/${id}`, input),
    onSuccess: refresh,
  });
}

/** Removes one payment. */
export function useDeleteDonation() {
  const refresh = useRefreshLedger();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/admin/donations/${id}`),
    onSuccess: refresh,
  });
}
