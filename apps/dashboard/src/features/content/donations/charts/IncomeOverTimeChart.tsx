import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DonationBucket, DonationPeriod } from "@lmaa/contracts";
import { formatEuroCents } from "@lmaa/shared";

import type { DashboardLocale } from "@/i18n/messages.ts";

import { formatPeriod, tickInterval } from "./chart-axis.ts";
import { ChartLegend, ChartTooltipCard } from "./chart-parts.tsx";
import { CHART_GRID, CHART_HOVER, axisStyle, markProps } from "./chart-tokens.ts";

/** What the chart draws for one period, once the view has been applied. */
interface PlottedPeriod extends DonationPeriod {
  /** The period written out, which is what the axis shows. */
  label: string;
}

/** Everything the time series needs. */
export interface IncomeOverTimeChartProps {
  /** One entry per period, oldest first, gaps already filled with zero. */
  periods: DonationPeriod[];
  /** How wide one period is, which decides how a tick is written. */
  bucket: DonationBucket;
  /** Whether the bars show each period on its own or the running total. */
  accumulated: boolean;
  /** Which language the axis and the tooltip are written in. */
  locale: DashboardLocale;
  /** What the two halves of a bar are called. */
  labels: { sponsorships: string; donations: string; total: string };
}

/**
 * What came in over time, as one bar per period.
 *
 * The bar is stacked into the money that paid for a sponsorship and the money
 * that did not, which is the only distinction on this page that colour carries.
 * Accumulated, the same two figures are added up as the window runs, which is
 * the view that answers whether a year is on course rather than what one month
 * did.
 *
 * @param props - The periods, how wide they are, which view to draw, and the
 *   language for the axis.
 * @returns A stacked bar chart with its own legend above it.
 *
 * @remarks
 * The legend and the tooltip are drawn here rather than taken from the chart
 * library, because both would otherwise carry the library's own type and
 * colours instead of the dashboard's tokens.
 */
export function IncomeOverTimeChart({
  periods,
  bucket,
  accumulated,
  locale,
  labels,
}: IncomeOverTimeChartProps) {
  const plotted = useMemo<PlottedPeriod[]>(() => {
    let sponsorSoFar = 0;
    let donationSoFar = 0;
    return periods.map((period) => {
      sponsorSoFar += period.sponsorCents;
      donationSoFar += period.donationCents;
      return {
        ...period,
        sponsorCents: accumulated ? sponsorSoFar : period.sponsorCents,
        donationCents: accumulated ? donationSoFar : period.donationCents,
        label: formatPeriod(period.start, bucket, locale),
      };
    });
  }, [accumulated, bucket, locale, periods]);

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend
        entries={[
          { label: labels.sponsorships, series: 1 },
          { label: labels.donations, series: 2 },
        ]}
      />

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={plotted} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            interval={tickInterval(plotted.length)}
            tickLine={false}
            axisLine={false}
            {...axisStyle}
          />
          <YAxis
            tickFormatter={(cents: number) => formatEuroCents(cents)}
            tickLine={false}
            axisLine={false}
            width={80}
            {...axisStyle}
          />
          <Tooltip
            cursor={{ fill: CHART_HOVER }}
            content={({ active, payload }) => {
              const period = active ? (payload?.[0]?.payload as PlottedPeriod | undefined) : null;
              if (!period) return null;
              return (
                <ChartTooltipCard title={formatPeriod(period.start, bucket, locale, true)}>
                  <ChartTooltipCard.Row
                    label={labels.sponsorships}
                    value={formatEuroCents(period.sponsorCents)}
                    series={1}
                  />
                  <ChartTooltipCard.Row
                    label={labels.donations}
                    value={formatEuroCents(period.donationCents)}
                    series={2}
                  />
                  <ChartTooltipCard.Row
                    label={labels.total}
                    value={formatEuroCents(period.sponsorCents + period.donationCents)}
                  />
                </ChartTooltipCard>
              );
            }}
          />
          {/* Stacked with the sponsorship money at the bottom, so the half that
              carries most of the year sits on the baseline where it is read
              against it. Only the upper half is rounded, because the two
              together are one bar. */}
          <Bar dataKey="sponsorCents" stackId="income" {...markProps(1)} />
          <Bar dataKey="donationCents" stackId="income" {...markProps(2)} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
