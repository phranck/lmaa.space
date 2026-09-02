import { BankIcon, PlugsConnectedIcon, PlugsIcon } from "@phosphor-icons/react";
import { type ReactNode, useMemo, useState } from "react";

import type { BankConnectionStatus } from "@lmaa/contracts";
import type { ApiRequestError } from "@lmaa/shared/api-error";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { BANK_CONNECTION_STATE_COLORS } from "./bank-connection-colors.ts";
import { resolveBankConnectionState } from "./bank-connection-state.ts";
import {
  useBankConnection,
  useDisconnectBank,
  useStartBankAuthorization,
} from "./hooks/useBankConnection.ts";

/** The code the backend answers with when it let go but the bank would not. */
const CLOSE_FAILED_CODE = "bank_close_failed";

/** One labelled line of the status card. */
function StatusRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2">
      <span className="text-sm text-[var(--ds-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--ds-text)]">{children}</span>
    </div>
  );
}

/**
 * The link to the bank account whose payments the site counts.
 *
 * Everything shown here comes from the site's own database, so the page still
 * says what it knows whilst the bank is unreachable. Two things leave the
 * dashboard: the request that starts an authorisation, which answers with an
 * address the browser is sent to, and the one that lets the account go again.
 *
 * @returns The page.
 */
export function BankConnectionPage() {
  const { messages, locale } = useI18n();
  const text = messages.system.bankConnection;
  const common = messages.common;

  const connectionQuery = useBankConnection();
  const startAuthorization = useStartBankAuthorization();
  const disconnect = useDisconnectBank();
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);

  const status: BankConnectionStatus | undefined = connectionQuery.data;
  const state = status ? resolveBankConnectionState(status, new Date()) : null;

  // Built once per locale rather than once per date: constructing a formatter
  // is what the call that formats otherwise does every time it runs.
  const formatDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long" }),
    [locale],
  );

  function connect() {
    startAuthorization.mutate(undefined, {
      onSuccess: ({ url }) => {
        // The bank identifies the account holder on its own pages, so this is
        // where the dashboard hands over.
        window.location.href = url;
      },
    });
  }

  // A failed disconnect means one of two different things, and the second one
  // has already changed the stored state, so it cannot be reported as a refusal.
  const disconnectFailure = disconnect.error as ApiRequestError | null;
  const disconnectMessage =
    disconnectFailure?.code === CLOSE_FAILED_CODE ? text.disconnectPartial : text.disconnectFailed;

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        {status?.configured === true && (
          <div className="flex items-center gap-2">
            {status.connected && (
              <DashboardButton
                variant="danger"
                disabled={disconnect.isPending}
                leadingIcon={<PlugsIcon weight="duotone" className="size-4" />}
                onClick={() => setIsConfirmingDisconnect(true)}
              >
                {text.disconnect}
              </DashboardButton>
            )}
            <DashboardButton
              variant="primary"
              disabled={startAuthorization.isPending}
              leadingIcon={<PlugsConnectedIcon weight="duotone" className="size-4" />}
              onClick={connect}
            >
              {status.connected ? text.renew : text.connect}
            </DashboardButton>
          </div>
        )}
      </PageHeader>

      <PageBody>
        {connectionQuery.isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {common.loading}
          </div>
        )}

        {state === "unconfigured" && (
          <ContentUnavailableView
            chromeless
            icon={<BankIcon weight="duotone" aria-hidden />}
            title={text.unconfiguredTitle}
            subtitle={text.unconfiguredHint}
          />
        )}

        {status !== undefined && state !== null && state !== "unconfigured" && (
          <DashboardSection>
            <DashboardSection.Header
              icon={<BankIcon weight="duotone" className="size-4" />}
              title={text.stateTitle}
              subtitle={text.stateHint}
              addOn={
                <Badge colorClass={BANK_CONNECTION_STATE_COLORS[state]}>{text.states[state]}</Badge>
              }
            />
            <DashboardSection.Body>
              <div className="divide-y divide-[var(--ds-border-subtle)]">
                <StatusRow label={text.institutionLabel}>
                  {status.connected
                    ? `${status.institutionName} (${status.institutionCountry})`
                    : text.valueAbsent}
                </StatusRow>
                <StatusRow label={text.connectedAtLabel}>
                  {status.connectedAt
                    ? formatDate.format(new Date(status.connectedAt))
                    : text.valueAbsent}
                </StatusRow>
                <StatusRow label={text.consentValidUntilLabel}>
                  {status.consentValidUntil
                    ? formatDate.format(new Date(status.consentValidUntil))
                    : text.valueAbsent}
                </StatusRow>
              </div>

              {startAuthorization.isError && (
                <p className="text-sm text-[var(--ds-badge-danger-text)]">{text.startFailed}</p>
              )}
              {disconnect.isError && (
                <p className="text-sm text-[var(--ds-badge-danger-text)]">{disconnectMessage}</p>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        )}
      </PageBody>

      <DeleteConfirmDialog
        open={isConfirmingDisconnect}
        title={text.disconnectTitle}
        description={text.disconnectConfirm}
        cancelLabel={common.cancel}
        deleteLabel={text.disconnect}
        isPending={disconnect.isPending}
        titleIcon={<PlugsIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setIsConfirmingDisconnect(false)}
        onConfirm={() => {
          disconnect.mutate(undefined, { onSettled: () => setIsConfirmingDisconnect(false) });
        }}
      />
    </PageLayout>
  );
}
