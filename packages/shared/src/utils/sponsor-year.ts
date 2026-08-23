/** How long a sponsorship stands, in days. */
export const SPONSOR_YEAR_DAYS = 365;

/**
 * How long a sponsorship still stands.
 *
 * A sponsorship runs from the day it was paid rather than with the calendar, so
 * two sponsors from the same year drop out on different days.
 *
 * @param paidAt - The day it was paid, as `YYYY-MM-DD`.
 * @param today - The current day, as `YYYY-MM-DD`.
 * @returns Days left, zero once it has run out.
 */
export function daysLeft(paidAt: string, today: string): number {
  const paid = Date.parse(`${paidAt}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(paid) || Number.isNaN(now)) return 0;
  const used = Math.floor((now - paid) / 86_400_000);
  return Math.max(SPONSOR_YEAR_DAYS - used, 0);
}

/**
 * Whether a sponsorship still stands today.
 *
 * @param paidAt - The day it was paid, as `YYYY-MM-DD`.
 * @param today - The current day, as `YYYY-MM-DD`.
 * @returns `true` whilst the year has not run out.
 */
export function isCurrent(paidAt: string, today: string): boolean {
  return daysLeft(paidAt, today) > 0;
}
