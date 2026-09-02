import { DONATION_MONTH_DAYS, SPONSOR_YEAR_DAYS, periodStart } from "@lmaa/shared";

/**
 * The windows the chart page offers before anybody types a date.
 *
 * Named by what somebody asks rather than by their length, and ordered by how
 * far each one reaches. `quarter` is the longest window still drawn as daily
 * bars, so the two views of the same page are one click apart. `all` carries no
 * bounds, which is what makes the axis reach as far as the ledger does.
 *
 * `thisYear` is the odd one and is deliberately kept beside `year`. The others
 * roll back from today, whilst this one starts on the first of January, so on
 * the second of September it covers 245 days and on the second of January it
 * covers two. It is what somebody means asking how the year is going, and it is
 * not the same question as the last twelve months.
 */
export const DONATION_CHART_PRESETS = ["month", "quarter", "thisYear", "year", "all"] as const;

/** One of the windows offered above the charts. */
export type DonationChartPreset = (typeof DONATION_CHART_PRESETS)[number];

/**
 * How many days each rolling preset reaches back, counting today as one of them.
 *
 * The month and the year take the lengths the rest of the project counts them
 * in, so a figure on this page covers the same period as the one the ledger
 * page prints beside it. The quarter is a number of its own, chosen to stay
 * inside what the route still draws by day.
 */
const PRESET_DAYS: Record<Exclude<DonationChartPreset, "all" | "thisYear">, number> = {
  month: DONATION_MONTH_DAYS,
  quarter: 90,
  year: SPONSOR_YEAR_DAYS,
};

/** A window as the route takes it. Either end may be absent. */
export interface DonationChartWindow {
  from?: string;
  to?: string;
}

/**
 * Turns a preset into the window it stands for.
 *
 * @param preset - Which of the offered windows was chosen.
 * @param today - The day to count back from, as `YYYY-MM-DD`.
 * @returns A closed window for every preset but `all`, which is open at both
 *   ends so the ledger itself decides how far the chart reaches.
 */
export function windowForPreset(preset: DonationChartPreset, today: string): DonationChartWindow {
  if (preset === "all") return {};
  // The calendar year starts where the calendar says rather than a fixed number
  // of days back, which is the whole difference between it and the twelve
  // months beside it.
  if (preset === "thisYear") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return { from: periodStart(today, PRESET_DAYS[preset]), to: today };
}

/**
 * Whether a window was typed rather than picked from the presets.
 *
 * A window somebody typed matches no preset, and the control above the charts
 * shows nothing selected whilst that is the case.
 *
 * On a handful of days in the year two presets describe the same window, such
 * as the thirtieth of January, where the last thirty days and the calendar year
 * both begin on the first. The first match wins, which is harmless: the two
 * ask for identical data, so whichever is shown as chosen draws the same page.
 *
 * @param window - The window in force.
 * @param today - The day the presets count back from, as `YYYY-MM-DD`.
 * @returns The preset that produces this window, or `null` for one that none
 *   of them do.
 */
export function presetForWindow(
  window: DonationChartWindow,
  today: string,
): DonationChartPreset | null {
  return (
    DONATION_CHART_PRESETS.find((preset) => {
      const candidate = windowForPreset(preset, today);
      return candidate.from === window.from && candidate.to === window.to;
    }) ?? null
  );
}
