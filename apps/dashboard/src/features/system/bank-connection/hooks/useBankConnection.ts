import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  BankAuthorizationStart,
  BankConnectionCallback,
  BankConnectionStatus,
} from "@lmaa/contracts";

import { api } from "@/lib/api.ts";

const BANK_CONNECTION_KEY = ["bank-connection"] as const;

/**
 * What the site knows about its link to the bank account.
 *
 * @param enabled - Whether to ask at all. The route belongs to the owner, so a
 *   caller that renders for everybody passes their ownership here rather than
 *   letting the request come back 403 for the rest.
 * @returns The query holding the status, which is answered from the site's own
 *   database and therefore also whilst the bank is unreachable.
 */
export function useBankConnection(enabled = true) {
  return useQuery({
    queryKey: BANK_CONNECTION_KEY,
    queryFn: () => api.get<BankConnectionStatus>("/admin/bank-connection"),
    enabled,
  });
}

/**
 * Starts an authorisation and hands back where the browser has to go.
 *
 * @returns The mutation. Its result carries the bank's own address, which the
 *   caller navigates to; nothing happens until it does.
 */
export function useStartBankAuthorization() {
  return useMutation({
    mutationFn: () => api.post<BankAuthorizationStart>("/admin/bank-connection/authorize"),
  });
}

/**
 * Hands the return from the bank to the backend, which spends it.
 *
 * @returns The mutation. On success the status it answers replaces the cached
 *   one, so the page the caller lands on shows the new connection without
 *   asking for it again.
 */
export function useCompleteBankAuthorization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BankConnectionCallback) =>
      api.post<BankConnectionStatus>("/admin/bank-connection/session", input),
    onSuccess: (status) => {
      queryClient.setQueryData(BANK_CONNECTION_KEY, status);
    },
  });
}

/** What a run over the account did, or why it did nothing. */
export type BankSyncResult =
  | { ran: true; from: string; to: string; read: number; imported: number; skipped: number }
  | { ran: false; reason: string };

/**
 * Reads the account now rather than waiting for the next background run.
 *
 * @returns The mutation. Its result says what the run found, or why it did
 *   nothing, which is an ordinary answer rather than a failure.
 *
 * @remarks
 * Invalidates the ledger as well as the connection, because a run that took
 * payments in has changed what every figure on the income page adds up to.
 */
export function useSyncBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BankSyncResult>("/admin/bank-connection/sync"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BANK_CONNECTION_KEY });
      void queryClient.invalidateQueries({ queryKey: ["donations"] });
      void queryClient.invalidateQueries({ queryKey: ["donation-totals"] });
      void queryClient.invalidateQueries({ queryKey: ["donation-breakdown"] });
    },
  });
}

/**
 * Lets the account go and ends the consent behind it.
 *
 * @returns The mutation.
 *
 * @remarks
 * Invalidates whether it succeeded or not. The backend withdraws the connection
 * before it tries to close the session at the bank, so even the failure leaves
 * the stored status different from what the page is holding.
 */
export function useDisconnectBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<BankConnectionStatus>("/admin/bank-connection"),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: BANK_CONNECTION_KEY });
    },
  });
}
