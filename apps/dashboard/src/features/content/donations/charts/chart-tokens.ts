/**
 * The colours a chart paints with, as token references.
 *
 * Handed to each mark as a prop rather than applied through a stylesheet rule.
 * A chart library passes such a prop through to the SVG as a presentation
 * attribute, and an attribute resolves a custom property exactly as a
 * declaration does, so the mark still reads the token. Measured on the
 * dashboard's own page: a `<line stroke="var(--probe)">` computes to the
 * property's value.
 *
 * A rule would have to match whatever element the library decides to put the
 * class on, and that differs per component: a grid hands its class down to
 * every line it draws, whilst a bar keeps it on the group above its shapes. A
 * prop lands on the mark either way.
 */
export const CHART_SERIES = {
  1: "var(--ds-chart-series-1)",
  2: "var(--ds-chart-series-2)",
} as const;

/** Which of the two series a mark or a swatch belongs to. */
export type SeriesSlot = keyof typeof CHART_SERIES;

/**
 * The surface a chart stands on, drawn as a stroke around each mark.
 *
 * That stroke is what puts a gap between the two halves of a stacked bar and
 * between one bar and its neighbour. Drawn rather than left as a gap, so it
 * follows the mark's own rounded corners. Reached through `markProps` rather
 * than exported, because a mark that took the surface without the width would
 * draw a hairline instead of a gap.
 */
const CHART_SURFACE = "var(--ds-section-body-bg)";

/** How wide that separating stroke is. */
const CHART_SURFACE_STROKE_WIDTH = 2;

/** The grid lines a bar is measured against. */
export const CHART_GRID = "var(--ds-chart-grid)";

/** What a chart highlights under the pointer. */
export const CHART_HOVER = "var(--ds-surface-hover)";

/**
 * How an axis writes its ticks.
 *
 * Spread onto the axis rather than set per chart, so the charts on the page
 * cannot end up with different sizes of tick label. The tone is the hint
 * colour, because an axis is measured against and not read.
 */
export const axisStyle = {
  tick: { fill: "var(--ds-text-hint)", fontSize: 12 },
} as const;

/**
 * The props that draw one mark: its colour, and the stroke holding it apart
 * from whatever it touches.
 *
 * A legend swatch takes `CHART_SERIES` on its own, because it touches nothing.
 *
 * @param series - Which series the mark belongs to.
 * @returns Fill and stroke, ready to spread onto a bar.
 */
export function markProps(series: SeriesSlot) {
  return {
    fill: CHART_SERIES[series],
    stroke: CHART_SURFACE,
    strokeWidth: CHART_SURFACE_STROKE_WIDTH,
  };
}
