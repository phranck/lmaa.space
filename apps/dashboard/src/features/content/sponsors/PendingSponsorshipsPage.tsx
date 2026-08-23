import { HandHeartIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { SPONSORING_DEFAULTS } from "@lmaa/contracts";
import { fullName } from "@lmaa/shared";
import { Dialog, dialogHeaderIconClass } from "@lmaa/ui";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CancelActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardField, DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type PendingSponsorshipRow,
  useDeletePendingSponsorship,
  usePendingSponsorships,
  useTakeOverPendingSponsorship,
} from "@/features/content/sponsors/hooks/usePendingSponsorships.ts";
import { useSponsoringConfig } from "@/features/content/sponsors/hooks/useSponsors.ts";
import { PendingSponsorshipTable } from "@/features/content/sponsors/PendingSponsorshipTable.tsx";

/** What the takeover dialogue asks for, whilst it is being filled in. */
interface PaymentDraft {
  amountEur: number;
  paidAt: string;
}

/**
 * The announcements that have not become sponsors yet.
 *
 * Somebody says on the site who they are, and the transfer that follows carries
 * only a reference. This is where the two are put together: the reference in
 * the first column is what the statement shows, and the button beside it makes
 * a sponsor of everything the person already wrote.
 */
export function PendingSponsorshipsPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const text = messages.system.pendingSponsorships;
  const sponsorText = messages.system.sponsors;

  const { data: entries, isLoading } = usePendingSponsorships();
  const { data: config } = useSponsoringConfig();
  const takeOver = useTakeOverPendingSponsorship();
  const remove = useDeletePendingSponsorship();

  /** The entry the takeover dialogue is open for, or nothing. */
  const [takingOver, setTakingOver] = useState<PendingSponsorshipRow | null>(null);
  /** The entry the delete confirmation is open for, or nothing. */
  const [deleting, setDeleting] = useState<PendingSponsorshipRow | null>(null);
  const [payment, setPayment] = useState<PaymentDraft>({ amountEur: 0, paidAt: "" });

  function openTakeOver(entry: PendingSponsorshipRow) {
    // What is offered is what a sponsorship costs at least and the day the
    // operator is looking at the statement. Both are read off it and corrected
    // here, because neither is anything the payer could have typed.
    const minimumCents = config?.minAmountCents ?? SPONSORING_DEFAULTS.minAmountCents;
    setPayment({ amountEur: minimumCents / 100, paidAt: new Date().toISOString().slice(0, 10) });
    setTakingOver(entry);
  }

  function confirmTakeOver() {
    if (!takingOver) return;
    takeOver.mutate(
      {
        id: takingOver.id,
        payment: {
          amountCents: Math.round(payment.amountEur * 100),
          paidAt: payment.paidAt,
        },
      },
      { onSuccess: () => setTakingOver(null) },
    );
  }

  return (
    <PageLayout>
      <PageHeader title={text.title} />

      <PageBody className="overflow-y-auto">
        {isLoading && (
          <div className="space-y-px">
            {Array.from({ length: 3 }, (_, index) => `skeleton-${index}`).map((key) => (
              <div
                key={key}
                className="h-14 bg-[var(--ds-surface)] animate-pulse border-b border-[var(--ds-border-subtle)]"
              />
            ))}
          </div>
        )}

        {!isLoading && (entries?.length ?? 0) === 0 && (
          <ContentUnavailableView
            icon={<HandHeartIcon weight="duotone" aria-hidden />}
            title={text.emptyTitle}
            subtitle={text.emptyHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && (entries?.length ?? 0) > 0 && (
          <DashboardSection className="overflow-hidden">
            <PendingSponsorshipTable
              entries={entries ?? []}
              onTakeOver={openTakeOver}
              onDelete={setDeleting}
            />
          </DashboardSection>
        )}
      </PageBody>

      <Dialog
        open={takingOver !== null}
        title={text.takeOverTitle}
        titleIcon={<HandHeartIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setTakingOver(null)}
      >
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-[var(--ds-text-muted)]">
            {takingOver ? fullName(takingOver.firstName, takingOver.lastName) : ""}
          </p>
          <p className="text-sm text-[var(--ds-text-muted)]">{text.takeOverHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DashboardNumberInput
              label={sponsorText.amountLabel}
              value={payment.amountEur}
              min={0}
              step={1}
              onChange={(event) =>
                setPayment((current) => ({ ...current, amountEur: Number(event.target.value) }))
              }
            />
            <DashboardField label={sponsorText.paidAtLabel}>
              <DateTimePicker
                mode="date"
                value={payment.paidAt}
                onChange={(value) => setPayment((current) => ({ ...current, paidAt: value }))}
              />
            </DashboardField>
          </div>
        </div>
        <Dialog.Footer>
          <CancelActionButton label={common.cancel} onClick={() => setTakingOver(null)} />
          <SaveActionButton
            onClick={confirmTakeOver}
            disabled={takeOver.isPending || payment.paidAt === ""}
            busy={takeOver.isPending}
            label={text.takeOver}
          />
        </Dialog.Footer>
      </Dialog>

      <DeleteConfirmDialog
        open={deleting !== null}
        title={text.deleteTitle}
        description={text.deleteMessage}
        cancelLabel={common.cancel}
        deleteLabel={common.delete}
        isPending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </PageLayout>
  );
}
