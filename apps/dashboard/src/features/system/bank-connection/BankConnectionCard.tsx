import { ArrowsClockwiseIcon, BankIcon, PlugsConnectedIcon } from "@phosphor-icons/react";
import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { groupIban } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { Badge } from "@/components/ui/Badge.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardField } from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useSponsoringConfig } from "@/features/content/sponsors/hooks/useSponsors.ts";

import { BANK_CONNECTION_STATE_COLORS } from "./bank-connection-colors.ts";
import { resolveBankConnectionState } from "./bank-connection-state.ts";
import { useBankConnection, useSyncBank } from "./hooks/useBankConnection.ts";

/** Where the connection itself is made and renewed. */
const BANK_CONNECTION_PATH = "/bank-connection";

/** One labelled figure of the card. */
function CardFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--ds-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--ds-text)]">{children}</span>
    </div>
  );
}

/**
 * The bank connection, beside the figures it keeps up to date.
 *
 * It stands here rather than only on its own page because this is where the
 * consequence shows: a lapsed consent leaves every figure above it standing
 * still, and a badge nobody goes looking for is a badge nobody reads.
 *
 * @returns The card, or nothing whilst the site holds no credential at all.
 */
export function BankConnectionCard() {
  const { messages, locale } = useI18n();
  const { user } = useAuth();
  const text = messages.system.bankConnection;
  const navigate = useNavigate();

  const { data: status } = useBankConnection();
  // The account this connection reads, as its owner knows it. Kept in the
  // sponsoring settings, because that is where it is entered.
  const { data: config } = useSponsoringConfig();
  const sync = useSyncBank();
  /**
   * The day a read is asked to start at, empty for the days it takes by itself.
   *
   * Held here rather than in the address bar, because it is the wording of one
   * question being asked now and not a view of the page worth returning to.
   */
  const [syncFrom, setSyncFrom] = useState("");

  // Built once per locale rather than once per date.
  const formatDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long" }),
    [locale],
  );
  const formatDateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  if (!status?.configured) return null;

  const state = resolveBankConnectionState(status, new Date());
  // What a successful read did, with the repairs named only where there were
  // any: a run that added payments and one that completed rows that were
  // already there are different answers, and "0 ergänzt" on every ordinary
  // run is a figure nobody needs.
  const lastRunOutcome = status.lastReadSucceeded
    ? [
        `${status.lastReadImported} ${text.lastReadImported}`,
        ...(status.lastReadFilled > 0 ? [`${status.lastReadFilled} ${text.lastReadFilled}`] : []),
      ].join(", ")
    : text.lastReadFailed;
  const lastRun = status.lastReadAt
    ? `${formatDateTime.format(new Date(status.lastReadAt))} · ${lastRunOutcome}`
    : text.lastReadNever;
  // What the bank said, where it said anything. A failure the operator cannot
  // name is one they cannot act on, and the general sentence covered a lapsed
  // consent and a refused request alike.
  const failure =
    status.lastReadSucceeded === false && status.lastReadFailure
      ? (text.failures[status.lastReadFailure] ?? text.failures.bank_unknown_error)
      : null;

  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<BankIcon weight="duotone" className="size-4" />}
        title={text.cardTitle}
        subtitle={text.cardHint}
        addOn={<Badge colorClass={BANK_CONNECTION_STATE_COLORS[state]}>{text.states[state]}</Badge>}
      />
      <DashboardSection.Body>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
          <CardFact label={text.institutionLabel}>
            {status.connected
              ? `${status.institutionName} (${status.institutionCountry})`
              : text.valueAbsent}
          </CardFact>
          {/* The account as its owner knows it. The provider's identifier was
              here before and answered nothing: a random UUID's last four
              characters are not something anybody recognises. This is the
              payee account from the sponsoring settings, which is the account
              this connection reads. */}
          <CardFact label={text.accountLabel}>
            {config?.payeeIban ? groupIban(config.payeeIban) : text.valueAbsent}
          </CardFact>
          <CardFact label={text.consentValidUntilLabel}>
            {status.consentValidUntil
              ? formatDate.format(new Date(status.consentValidUntil))
              : text.valueAbsent}
          </CardFact>
          <CardFact label={text.lastReadLabel}>{lastRun}</CardFact>
        </div>

        {/* What the bank said takes precedence over the general sentence: the
            general one covers every cause there is and names none of them. */}
        {failure ? (
          <p className="text-sm text-[var(--ds-badge-danger-text)]">{failure}</p>
        ) : (
          sync.isError && (
            <p className="text-sm text-[var(--ds-badge-danger-text)]">{text.syncFailed}</p>
          )
        )}
      </DashboardSection.Body>

      {/* Owner only. An admin may read the state, and neither button is theirs
          to press: both reach the bank account. */}
      {user?.isOwner && (
        <DashboardSection.Footer className="flex flex-wrap items-end justify-end gap-2">
          {/* Away from the buttons on purpose: it is what the read is asked
              for rather than an action, and the two buttons keep the corner a
              reader looks in. */}
          <div className="mr-auto">
            <DashboardField label={text.syncFromLabel} hint={text.syncFromHint}>
              <DateTimePicker mode="date" value={syncFrom} onChange={setSyncFrom} />
            </DashboardField>
          </div>
          <DashboardButton
            leadingIcon={<PlugsConnectedIcon weight="duotone" className="size-4" />}
            onClick={() => void navigate(BANK_CONNECTION_PATH)}
          >
            {status.connected ? text.renew : text.connect}
          </DashboardButton>
          <DashboardButton
            variant="primary"
            disabled={!status.connected || sync.isPending}
            leadingIcon={<ArrowsClockwiseIcon weight="duotone" className="size-4" />}
            onClick={() => sync.mutate(syncFrom ? { from: syncFrom } : {})}
          >
            {sync.isPending ? text.syncing : text.syncNow}
          </DashboardButton>
        </DashboardSection.Footer>
      )}
    </DashboardSection>
  );
}
