/**
 * Dates and timestamps, written the one way this project writes them.
 *
 * The numeric form is the one the dashboard already used in most places, so
 * `05.08.2026` and `05.08.2026, 11:07` in German. Seconds are left out, because
 * nothing on screen is decided by them.
 *
 * It lives here rather than beside each surface because it had begun to
 * disagree with itself: some places passed the option set, some called
 * `toLocaleString` bare and got a different day, month and seconds, and one
 * passed no language at all and printed the American order.
 */

/** The languages the dashboard speaks. The site itself only uses German. */
export type FormatLocale = "de" | "en";

/** What a formatter is given, before it is turned into a date. */
export type DateInput = Date | string | number;

/** The option set behind {@link formatDate}. */
const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/** The option set behind {@link formatDateTime}. */
const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Formatters built once per language at module scope.
 *
 * The call that formats is also the call that builds, so constructing one per
 * table row is the expensive way to write a date.
 */
const DATE_FORMATTERS: Record<FormatLocale, Intl.DateTimeFormat> = {
  de: new Intl.DateTimeFormat("de-DE", DATE_OPTIONS),
  en: new Intl.DateTimeFormat("en-US", DATE_OPTIONS),
};

const DATE_TIME_FORMATTERS: Record<FormatLocale, Intl.DateTimeFormat> = {
  de: new Intl.DateTimeFormat("de-DE", DATE_TIME_OPTIONS),
  en: new Intl.DateTimeFormat("en-US", DATE_TIME_OPTIONS),
};

/**
 * Turns what a caller holds into a date, or into nothing.
 *
 * `Intl.DateTimeFormat` throws on an unusable date whilst `toLocaleString`
 * returned the words `Invalid Date`, so every caller that used to print those
 * words would now stop the render instead. An empty string is what a table cell
 * can live with.
 *
 * @param value - A date, an ISO string, or milliseconds since the epoch.
 * @returns The date, or `null` when it cannot be read.
 */
function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Writes a date without a time.
 *
 * @param value - A date, an ISO string, or milliseconds since the epoch.
 * @param locale - The language to write it in. German by default.
 * @returns The date as `05.08.2026`, or an empty string when it cannot be read.
 */
export function formatDate(value: DateInput, locale: FormatLocale = "de"): string {
  const date = toDate(value);
  return date ? DATE_FORMATTERS[locale].format(date) : "";
}

/**
 * Writes a date with the time of day, to the minute.
 *
 * @param value - A date, an ISO string, or milliseconds since the epoch.
 * @param locale - The language to write it in. German by default.
 * @returns The date as `05.08.2026, 11:07`, or an empty string when it cannot
 *   be read.
 */
export function formatDateTime(value: DateInput, locale: FormatLocale = "de"): string {
  const date = toDate(value);
  return date ? DATE_TIME_FORMATTERS[locale].format(date) : "";
}
