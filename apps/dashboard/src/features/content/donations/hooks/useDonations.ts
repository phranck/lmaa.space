import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Donation, DonationInput, DonationTotals } from "@lmaa/contracts";

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

/**
 * Every payment in a window, most recent first, with that window's sum.
 *
 * The list and the sum come from one request, so the total under the table can
 * never describe a different window from the rows above it.
 *
 * @param range - The days to include. Both ends count.
 */
export function useDonations(range: DonationRangeFilter = {}) {
  const query = new URLSearchParams();
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  return useQuery({
    queryKey: ["donations", range.from ?? "", range.to ?? ""],
    queryFn: () => api.get<DonationLedger>(`/admin/donations${suffix}`),
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
 * The ledger is cached per window and the figures above it are their own query,
 * so a saved payment has to reach both. Held here rather than repeated in each
 * mutation, because a third mutation would otherwise forget one of them.
 */
function useRefreshLedger() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["donations"] });
    void queryClient.invalidateQueries({ queryKey: ["donation-totals"] });
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
