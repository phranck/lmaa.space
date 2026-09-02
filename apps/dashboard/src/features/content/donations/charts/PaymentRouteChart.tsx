import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DONATION_PROVIDERS, type DonationProviderTotal } from "@lmaa/contracts";
import { formatEuroCents } from "@lmaa/shared";

import { ChartTooltipCard } from "./chart-parts.tsx";
import { CHART_GRID, CHART_HOVER, axisStyle, markProps } from "./chart-tokens.ts";

/** One route, with the name the dashboard shows for it. */
interface PlottedRoute extends DonationProviderTotal {
  /** What the route is called, which is what the axis shows. */
  label: string;
}

/** Everything the payment routes chart needs. */
export interface PaymentRouteChartProps {
  /** One entry per route that carried money, largest first. */
  providers: DonationProviderTotal[];
  /** What a count of payments is called, for the tooltip. */
  countLabel: string;
  /** What the amount is called, for the tooltip. */
  amountLabel: string;
}

/**
 * How tall one bar and its share of the gap between two of them is.
 *
 * Enough that a route's name has its own line beside its bar rather than
 * sharing the height with the one above it.
 */
const ROW_HEIGHT = 44;

/**
 * Where the money comes from, as one horizontal bar per payment route.
 *
 * Horizontal because a route's name is a word rather than a date, and a column
 * of words is read down the side without turning any of them. Sorted by amount,
 * so the answer to which route carries the year is the top bar.
 *
 * Every bar carries the same colour. The route is named on the axis beside it,
 * so a hue would encode a second time what the label already says, and ten
 * routes would need ten hues that nothing could tell apart.
 *
 * @param props - The routes and the two words the tooltip needs.
 * @returns A horizontal bar chart, as tall as it has routes.
 */
export function PaymentRouteChart({ providers, countLabel, amountLabel }: PaymentRouteChartProps) {
  const plotted: PlottedRoute[] = providers.map((entry) => ({
    ...entry,
    label: DONATION_PROVIDERS[entry.provider],
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(plotted.length * ROW_HEIGHT, ROW_HEIGHT)}>
      <BarChart
        data={plotted}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 4 }}
        barCategoryGap="25%"
      >
        <CartesianGrid stroke={CHART_GRID} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(cents: number) => formatEuroCents(cents)}
          tickLine={false}
          axisLine={false}
          {...axisStyle}
        />
        {/* Every category keeps its label. The chart library defaults an axis
            to `preserveEnd`, which drops a tick standing closer than five
            pixels to its neighbour, and on this axis a dropped tick is a bar
            with no name. Colour says nothing here either, so an unnamed bar
            says nothing at all. */}
        <YAxis
          type="category"
          dataKey="label"
          interval={0}
          tickLine={false}
          axisLine={false}
          width={120}
          {...axisStyle}
        />
        <Tooltip
          cursor={{ fill: CHART_HOVER }}
          content={({ active, payload }) => {
            const route = active ? (payload?.[0]?.payload as PlottedRoute | undefined) : null;
            if (!route) return null;
            return (
              <ChartTooltipCard title={route.label}>
                <ChartTooltipCard.Row label={amountLabel} value={formatEuroCents(route.cents)} />
                <ChartTooltipCard.Row label={countLabel} value={String(route.count)} />
              </ChartTooltipCard>
            );
          }}
        />
        {/* Rounded at the end the bar grows towards, and square where it meets
            the axis, so the bar reads as measured from the baseline. */}
        <Bar dataKey="cents" {...markProps(1)} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
