import { ChartBarIcon, ChartLineUpIcon, CoinsIcon, HandCoinsIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { SPONSORING_DEFAULTS } from "@lmaa/contracts";
import { formatEuroCents } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardField } from "@/components/ui/DashboardControls.tsx";
import { DateTimePicker } from "@/components/ui/DateTimePicker.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { SkeletonRows } from "@/components/ui/SkeletonRows.tsx";
import { StatFigure } from "@/components/ui/StatFigure.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

import { FundingProgressBar } from "./charts/FundingProgressBar.tsx";
import { IncomeOverTimeChart } from "./charts/IncomeOverTimeChart.tsx";
import { PaymentRouteChart } from "./charts/PaymentRouteChart.tsx";
import {
  DONATION_CHART_PRESETS,
  type DonationChartPreset,
  type DonationChartWindow,
  presetForWindow,
  windowForPreset,
} from "./donation-chart-window.ts";
import { useDonationBreakdown, useDonationTotals } from "./hooks/useDonations.ts";
import { BankConnectionCard } from "../../system/bank-connection/BankConnectionCard.tsx";
import { useSponsoringConfig } from "../sponsors/hooks/useSponsors.ts";

/** Which of the two views of the same figures the time series draws. */
const TimeSeriesView = {
  PerPeriod: "per-period",
  Accumulated: "accumulated",
} as const;

/** One of the two views of the time series. */
type TimeSeriesView = (typeof TimeSeriesView)[keyof typeof TimeSeriesView];

/**
 * Writes a share as a whole percentage.
 *
 * @param part - How much of the whole is being described, in cents.
 * @param whole - What it is a share of, in cents.
 * @param absent - What to write where there is nothing to divide.
 * @returns The share, or `absent` for a window nothing came in over.
 */
function formatShare(part: number, whole: number, absent: string): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)} %` : absent;
}

/**
 * Writes what one payment was worth on average.
 *
 * @param totalCents - What the window holds altogether.
 * @param count - How many payments made it up.
 * @param absent - What to write where there are no payments to divide by.
 * @returns The average payment, or `absent` for an empty window.
 */
function formatAverage(totalCents: number, count: number, absent: string): string {
  return count > 0 ? formatEuroCents(Math.round(totalCents / count)) : absent;
}

/**
 * What came in, drawn rather than listed.
 *
 * One window is chosen at the top and everything below it answers for that
 * window: what arrived, how it moved over time, and which route carried it.
 * The exception is the funding bar at the bottom, which always measures the
 * sponsor year, because that is the period the running costs are set against
 * and it would mean nothing over any other.
 *
 * The ledger page beside this one is where a payment is entered. This one only
 * reads.
 */
export function DonationChartsPage() {
  const { locale, messages } = useI18n();
  const text = messages.system.donationCharts;
  const donationText = messages.system.donations;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [range, setRange] = useState<DonationChartWindow>(() => windowForPreset("year", today));
  const [view, setView] = useState<TimeSeriesView>(TimeSeriesView.PerPeriod);

  const { data: breakdown, isLoading } = useDonationBreakdown(range);
  const { data: totals } = useDonationTotals();
  const { data: config } = useSponsoringConfig();

  const preset = presetForWindow(range, today);
  const periods = breakdown?.periods ?? [];
  const providers = breakdown?.providers ?? [];
  const totalCents = breakdown?.totalCents ?? 0;
  const totalCount = breakdown?.totalCount ?? 0;
  const sponsorCents = breakdown?.sponsorCents ?? 0;

  const costsTotalCents = (config?.costs ?? SPONSORING_DEFAULTS.costs).reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );

  const presetOptions = useMemo(
    () => DONATION_CHART_PRESETS.map((value) => ({ value, label: text.presets[value] })),
    [text.presets],
  );

  const viewOptions = useMemo(
    () => [
      { value: TimeSeriesView.PerPeriod, label: text.viewPerPeriod },
      { value: TimeSeriesView.Accumulated, label: text.viewAccumulated },
    ],
    [text.viewAccumulated, text.viewPerPeriod],
  );

  const seriesLabels = useMemo(
    () => ({
      sponsorships: text.seriesSponsorships,
      donations: text.seriesDonations,
      total: text.seriesTotal,
    }),
    [text.seriesDonations, text.seriesSponsorships, text.seriesTotal],
  );

  const fundingLabels = useMemo(
    () => ({
      covered: text.fundingCovered,
      missing: text.fundingMissing,
      costs: text.fundingCosts,
      done: text.fundingDone,
    }),
    [text.fundingCosts, text.fundingCovered, text.fundingDone, text.fundingMissing],
  );

  return (
    <PageLayout>
      <PageHeader title={text.title} />

      <PageBody className="overflow-y-auto">
        <div className="grid gap-4">
          <DashboardSection>
            <DashboardSection.Header
              icon={<ChartLineUpIcon weight="duotone" className="size-4" />}
              title={text.windowTitle}
              subtitle={text.windowHint}
            />
            <DashboardSection.Body>
              {/* The controls stand together on the left and what they produce
                  on the right, so the row reads as a question and its answer
                  rather than as two rows of unrelated things. They stack under
                  each other once the card is too narrow to hold both. */}
              <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
                <div className="flex flex-col gap-4">
                  {/* Typed to allow no selection, which is the state a window
                      somebody typed into the two fields leaves it in. None of
                      the presets is then shown as chosen, because none is. */}
                  <SegmentedControl<DonationChartPreset | "">
                    options={presetOptions}
                    value={preset ?? ""}
                    onChange={(next) => next && setRange(windowForPreset(next, today))}
                  />

                  {/* The reset stands with the two fields rather than at the
                      card's edge, because it clears them rather than acting on
                      the card. */}
                  <div className="flex flex-wrap items-end gap-4">
                    <DashboardField label={donationText.rangeFrom}>
                      <DateTimePicker
                        mode="date"
                        value={range.from ?? ""}
                        onChange={(value) => setRange((current) => ({ ...current, from: value }))}
                      />
                    </DashboardField>
                    <DashboardField label={donationText.rangeTo}>
                      <DateTimePicker
                        mode="date"
                        value={range.to ?? ""}
                        onChange={(value) => setRange((current) => ({ ...current, to: value }))}
                      />
                    </DashboardField>
                    {!preset && (
                      <DashboardButton onClick={() => setRange(windowForPreset("year", today))}>
                        {donationText.rangeReset}
                      </DashboardButton>
                    )}
                  </div>
                </div>

                {/* Four figures rather than four charts: a single value asked
                    once is a number, and drawing it as a bar with nothing
                    beside it would say less than writing it down. */}
                <div className="flex flex-wrap items-start gap-8">
                  <StatFigure label={text.figureTotal} value={formatEuroCents(totalCents)} />
                  <StatFigure
                    label={text.figureCount}
                    value={String(totalCount)}
                    suffix={donationText.countSuffix}
                  />
                  <StatFigure
                    label={text.figureAverage}
                    value={formatAverage(totalCents, totalCount, text.figureAbsent)}
                  />
                  <StatFigure
                    label={text.figureSponsorShare}
                    value={formatShare(sponsorCents, totalCents, text.figureAbsent)}
                    suffix={formatEuroCents(sponsorCents)}
                  />
                </div>
              </div>
            </DashboardSection.Body>
          </DashboardSection>

          {/* Beneath the figures, because it says whether they are still being
              kept up to date. */}
          <BankConnectionCard />

          {isLoading && (
            <DashboardSection className="overflow-hidden">
              <SkeletonRows />
            </DashboardSection>
          )}

          {!isLoading && periods.length === 0 && (
            <ContentUnavailableView
              icon={<ChartBarIcon weight="duotone" aria-hidden />}
              title={text.emptyTitle}
              subtitle={text.emptyHint}
            />
          )}

          {!isLoading && periods.length > 0 && (
            <>
              <DashboardSection>
                <DashboardSection.Header
                  icon={<ChartBarIcon weight="duotone" className="size-4" />}
                  title={text.overTimeTitle}
                  // Names what the bars are currently showing rather than what
                  // the switch does. The two views draw the same money and are
                  // told apart only by whether a bar counts what came before
                  // it, which two words on a switch cannot carry.
                  subtitle={
                    view === TimeSeriesView.Accumulated
                      ? text.overTimeHintAccumulated
                      : text.overTimeHintPerPeriod
                  }
                  addOn={
                    <SegmentedControl<TimeSeriesView>
                      options={viewOptions}
                      value={view}
                      onChange={setView}
                      storageKey="donation-charts-view"
                    />
                  }
                />
                <DashboardSection.Body>
                  <IncomeOverTimeChart
                    periods={periods}
                    bucket={breakdown?.bucket ?? "month"}
                    accumulated={view === TimeSeriesView.Accumulated}
                    locale={locale}
                    labels={seriesLabels}
                  />
                </DashboardSection.Body>
              </DashboardSection>

              {providers.length > 0 && (
                <DashboardSection>
                  <DashboardSection.Header
                    icon={<HandCoinsIcon weight="duotone" className="size-4" />}
                    title={text.routesTitle}
                    subtitle={text.routesHint}
                  />
                  <DashboardSection.Body>
                    <PaymentRouteChart
                      providers={providers}
                      amountLabel={donationText.amountLabel}
                      countLabel={donationText.countSuffix}
                    />
                  </DashboardSection.Body>
                </DashboardSection>
              )}
            </>
          )}

          <DashboardSection>
            <DashboardSection.Header
              icon={<CoinsIcon weight="duotone" className="size-4" />}
              title={text.fundingTitle}
              subtitle={text.fundingHint}
            />
            <DashboardSection.Body>
              <FundingProgressBar
                costsTotalCents={costsTotalCents}
                coveredCents={totals?.yearCents ?? 0}
                labels={fundingLabels}
              />
            </DashboardSection.Body>
          </DashboardSection>
        </div>
      </PageBody>
    </PageLayout>
  );
}
