import type { ReactNode } from "react";

import { CHART_SERIES, type SeriesSlot } from "./chart-tokens.ts";

/** One entry of a legend. */
interface LegendEntry {
  label: string;
  series: SeriesSlot;
}

/**
 * The legend above a chart that draws more than one series.
 *
 * Present whenever colour carries meaning, so identity never rests on hue
 * alone. A chart of one series carries none, because its title already names
 * what the bars are.
 *
 * @param props - One entry per series, in the order the bars are stacked.
 * @returns A row of swatches with their names.
 */
export function ChartLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {entries.map((entry) => (
        <span key={entry.label} className="flex items-center gap-2">
          <ChartSwatch series={entry.series} />
          <span className="text-xs text-[var(--ds-text-hint)]">{entry.label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * The small square of colour that stands for one series.
 *
 * Drawn as an SVG rather than as a div so it takes its colour from the same
 * token the bars do, through the same `fill`. Hidden from screen readers, which
 * get the name beside it.
 *
 * @param props - Which series it stands for.
 * @returns A ten pixel swatch.
 */
function ChartSwatch({ series }: { series: SeriesSlot }) {
  return (
    <svg width="10" height="10" aria-hidden="true" className="shrink-0">
      <rect width="10" height="10" rx="2" fill={CHART_SERIES[series]} />
    </svg>
  );
}

/**
 * The card a chart shows under the pointer.
 *
 * Written here rather than taken from the chart library so it carries the
 * dashboard's own surface, border and type instead of the library's defaults.
 *
 * @param props - What the hovered mark is called, and the rows describing it.
 * @returns A small card, positioned by the chart around it.
 */
export function ChartTooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-40 rounded-[var(--radius-control)] border border-[var(--ds-border)] bg-[var(--ds-card-bg)] px-3 py-2 shadow-[var(--ds-shadow-md)]">
      <p className="mb-1.5 text-xs font-semibold text-[var(--ds-text)]">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

/**
 * One line of a tooltip, naming a figure and giving it.
 *
 * The name sits left and the figure right, so two figures in one card line up
 * as money does everywhere else. A row without a series is the total, and it
 * carries no swatch because it stands for no colour on the chart.
 *
 * @param props - The name, the written figure, and which series it belongs to.
 * @returns One row of the tooltip.
 */
ChartTooltipCard.Row = function ChartTooltipRow({
  label,
  value,
  series,
}: {
  label: string;
  value: string;
  series?: SeriesSlot;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-2 text-[var(--ds-text-hint)]">
        {series ? <ChartSwatch series={series} /> : <span className="w-2.5 shrink-0" />}
        {label}
      </span>
      <span className="tabular-nums text-[var(--ds-text)]">{value}</span>
    </div>
  );
};
