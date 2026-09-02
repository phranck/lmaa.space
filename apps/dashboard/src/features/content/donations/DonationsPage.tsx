import { HandCoinsIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import type { DonationOrigin } from "@lmaa/contracts";
import { formatEuroCents } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CreateActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardField } from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { StatFigure } from "@/components/ui/StatFigure.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { DonationEditorCard } from "./DonationEditorCard.tsx";
import { DonationTable } from "./DonationTable.tsx";
import { type DonationListFilter, useDonations, useDonationTotals } from "./hooks/useDonations.ts";

/**
 * Every payment that came in, whatever route it took.
 *
 * The figures at the top are the periods a sentence on the site can name, and
 * the filter below them answers any other period. What the year costs is set
 * under the sponsoring settings, because that figure belongs to no payment.
 */
export function DonationsPage() {
  const { messages } = useI18n();
  const text = messages.system.donations;

  const originOptions = useMemo(
    () =>
      [
        { value: "" as const, label: text.origins.all },
        { value: "manual" as const, label: text.origins.manual },
        { value: "bank" as const, label: text.origins.bank },
      ] satisfies readonly { value: DonationOrigin | ""; label: string }[],
    [text],
  );

  const [filter, setFilter] = useState<DonationListFilter>({});
  const { data: ledger, isLoading } = useDonations(filter);
  const { data: totals } = useDonationTotals();
  /** Which payment the card is showing, or nothing when it is closed. */
  const [editing, setEditing] = useState<string | null>(null);

  const donations = ledger?.donations ?? [];
  const hasRange = Boolean(filter.from ?? filter.to);
  const hasFilter = hasRange || Boolean(filter.origin);

  return (
    <PageLayout>
      <PageHeader title={text.title}>
        <CreateActionButton onClick={() => setEditing("new")} label={text.newDonation} />
      </PageHeader>

      <PageBody className="overflow-y-auto">
        <div className="grid gap-4">
          <DashboardSection>
            <DashboardSection.Header
              icon={<HandCoinsIcon weight="duotone" className="size-4" />}
              title={text.title}
              addOn={
                <div className="flex items-start gap-8">
                  <StatFigure
                    label={text.monthTotal}
                    value={formatEuroCents(totals?.monthCents ?? 0)}
                  />
                  <StatFigure
                    label={text.yearTotal}
                    value={formatEuroCents(totals?.yearCents ?? 0)}
                    suffix={`${totals?.yearCount ?? 0} ${text.countSuffix}`}
                  />
                </div>
              }
            />
            <DashboardSection.Body>
              <div className="flex flex-wrap items-end gap-4">
                {/* The reset stands with the two fields rather than at the
                    card's edge, because it clears them rather than acting on
                    the card. The sum it produces closes the row instead. */}
                <DashboardField label={text.rangeFrom}>
                  <DateTimePicker
                    mode="date"
                    value={filter.from ?? ""}
                    onChange={(value) => setFilter((current) => ({ ...current, from: value }))}
                  />
                </DashboardField>
                <DashboardField label={text.rangeTo}>
                  <DateTimePicker
                    mode="date"
                    value={filter.to ?? ""}
                    onChange={(value) => setFilter((current) => ({ ...current, to: value }))}
                  />
                </DashboardField>
                <DashboardField label={text.originLabel}>
                  {/* Typed to allow an empty choice, which is the state where
                      both origins are listed together. */}
                  <SegmentedControl<DonationOrigin | "">
                    options={originOptions}
                    value={filter.origin ?? ""}
                    onChange={(next) =>
                      setFilter((current) => ({ ...current, origin: next || undefined }))
                    }
                  />
                </DashboardField>
                {hasFilter && (
                  <DashboardButton onClick={() => setFilter({})}>{text.rangeReset}</DashboardButton>
                )}
                <div className="ml-auto">
                  <StatFigure
                    label={hasRange ? text.rangeTotal : text.allTotal}
                    value={formatEuroCents(ledger?.rangeCents ?? 0)}
                    suffix={`${ledger?.rangeCount ?? 0} ${text.countSuffix}`}
                  />
                </div>
              </div>
            </DashboardSection.Body>
          </DashboardSection>

          {isLoading && (
            <DashboardSection className="overflow-hidden">
              <SkeletonRows />
            </DashboardSection>
          )}

          {!isLoading && donations.length === 0 && (
            <ContentUnavailableView
              icon={<HandCoinsIcon weight="duotone" aria-hidden />}
              title={text.emptyTitle}
              subtitle={text.emptyHint}
            />
          )}

          {!isLoading && donations.length > 0 && (
            // The table fills the card to its edges, so the card's own corners
            // are the table's corners and there is no seam between the two.
            <DashboardSection className="overflow-hidden">
              <DonationTable donations={donations} onEdit={(donation) => setEditing(donation.id)} />
            </DashboardSection>
          )}
        </div>
      </PageBody>

      <DonationEditorCard
        donationId={editing}
        donations={donations}
        onClose={() => setEditing(null)}
      />
    </PageLayout>
  );
}
