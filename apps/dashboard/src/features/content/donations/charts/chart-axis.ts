import type { DonationBucket } from "@lmaa/contracts";

import type { DashboardLocale } from "@/i18n/messages.ts";

/**
 * The locale each of the dashboard's languages writes its dates in.
 *
 * Austrian German rather than German, matching how `formatEuroCents` writes
 * money, so a date and an amount on the same card come from the same place.
 */
const DATE_LOCALES: Record<DashboardLocale, string> = { de: "de-AT", en: "en-GB" };

/**
 * Date formatters, built once per language and period size.
 *
 * The call that formats is also the call that builds, so a formatter made
 * inside the axis callback would be built again for every tick on every render
 * and again for every point the pointer crosses.
 */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/** Returns the formatter for one language and period size, building it once. */
function formatterFor(
  locale: DashboardLocale,
  bucket: DonationBucket,
  long: boolean,
): Intl.DateTimeFormat {
  const key = `${locale}-${bucket}-${long ? "long" : "short"}`;
  const existing = FORMATTERS.get(key);
  if (existing) return existing;

  const options: Intl.DateTimeFormatOptions =
    bucket === "month"
      ? { month: long ? "long" : "short", year: "numeric", timeZone: "UTC" }
      : long
        ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
        : { day: "numeric", month: "short", timeZone: "UTC" };

  const built = new Intl.DateTimeFormat(DATE_LOCALES[locale], options);
  FORMATTERS.set(key, built);
  return built;
}

/**
 * Writes the day a period starts on, as an axis tick or as a tooltip heading.
 *
 * @param start - The first day of the period, as `YYYY-MM-DD`.
 * @param bucket - How wide the period is, which decides whether a day is named
 *   at all.
 * @param locale - Which language to write it in.
 * @param long - Whether it stands alone, as in a tooltip, rather than in a row
 *   of ticks where the year would repeat under every bar.
 * @returns The period written out, or the raw value where it is not a day.
 */
export function formatPeriod(
  start: string,
  bucket: DonationBucket,
  locale: DashboardLocale,
  long = false,
): string {
  const parsed = Date.parse(`${start}T00:00:00Z`);
  if (Number.isNaN(parsed)) return start;
  return formatterFor(locale, bucket, long).format(parsed);
}

/**
 * How many ticks to skip so the axis labels do not collide.
 *
 * Recharts drops a tick whose label overlaps its neighbour, which leaves an
 * axis with uneven gaps. Choosing the interval outright keeps the ticks evenly
 * spaced, whatever the window turns out to hold.
 *
 * @param count - How many periods the chart draws.
 * @returns How many ticks to leave out between two labelled ones.
 */
export function tickInterval(count: number): number {
  const MAX_LABELS = 12;
  return count <= MAX_LABELS ? 0 : Math.ceil(count / MAX_LABELS) - 1;
}
