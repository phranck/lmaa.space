import { BankIcon, PlugsConnectedIcon } from "@phosphor-icons/react";
import { type ReactNode, useMemo } from "react";

import type { BankConnectionStatus } from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { BADGE_TONES, Badge } from "@/components/ui/Badge.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { useBankConnection, useStartBankAuthorization } from "./hooks/useBankConnection.ts";

/** How many days before the consent lapses the page starts warning about it. */
const CONSENT_WARNING_DAYS = 21;

/** Milliseconds in a day, for reading the warning window above. */
const DAY_MS = 24 * 60 * 60 * 1000;

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
 * says what it knows whilst the bank is unreachable. The one thing that leaves
 * the dashboard is the request that starts an authorisation, and what comes
 * back from it is an address the browser is sent to.
 *
 * @returns The page.
 */
export function BankConnectionPage() {
  const { messages, locale } = useI18n();
  const text = messages.system.bankConnection;

  const connectionQuery = useBankConnection();
  const startAuthorization = useStartBankAuthorization();

  const status: BankConnectionStatus | undefined = connectionQuery.data;

  // Built once per locale rather than once per date: constructing a formatter
  // is what the call that formats otherwise does every time it runs.
  const formatDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long" }),
    [locale],
  );

  const consentEndsAt = status?.consentValidUntil ? new Date(status.consentValidUntil) : null;
  const consentEndsSoon =
    consentEndsAt !== null && consentEndsAt.getTime() - Date.now() < CONSENT_WARNING_DAYS * DAY_MS;

  function connect() {
    startAuthorization.mutate(undefined, {
      onSuccess: ({ url }) => {
        // The bank identifies the account holder on its own pages, so this is
        // where the dashboard hands over.
        window.location.href = url;
      },
    });
  }

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        {status?.configured === true && (
          <DashboardButton
            variant="primary"
            disabled={startAuthorization.isPending}
            leadingIcon={<PlugsConnectedIcon weight="duotone" className="size-4" />}
            onClick={connect}
          >
            {status.connected ? text.renew : text.connect}
          </DashboardButton>
        )}
      </PageHeader>

      <PageBody>
        {connectionQuery.isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-[var(--ds-text-muted)]">
            {messages.common.loading}
          </div>
        )}

        {status?.configured === false && (
          <ContentUnavailableView
            chromeless
            icon={<BankIcon weight="duotone" aria-hidden />}
            title={text.unconfiguredTitle}
            subtitle={text.unconfiguredHint}
          />
        )}

        {status?.configured === true && (
          <DashboardSection>
            <DashboardSection.Header
              icon={<BankIcon weight="duotone" className="size-4" />}
              title={text.stateTitle}
              subtitle={text.stateHint}
              addOn={
                <Badge colorClass={status.connected ? BADGE_TONES.success : BADGE_TONES.pending}>
                  {status.connected ? text.badgeConnected : text.badgeDisconnected}
                </Badge>
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
                  {consentEndsAt ? (
                    <span
                      className={consentEndsSoon ? "text-[var(--ds-badge-review-text)]" : undefined}
                    >
                      {formatDate.format(consentEndsAt)}
                    </span>
                  ) : (
                    text.valueAbsent
                  )}
                </StatusRow>
              </div>

              {startAuthorization.isError && (
                <p className="text-sm text-[var(--ds-badge-danger-text)]">{text.startFailed}</p>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        )}
      </PageBody>
    </PageLayout>
  );
}
