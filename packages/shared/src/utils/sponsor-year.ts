/** How long a sponsorship stands, in days. */
export const SPONSOR_YEAR_DAYS = 365;

/**
 * How far back the monthly figure looks, in days.
 *
 * Thirty days rather than the calendar month, so it is the same kind of period
 * as the year above it. A sentence quoting both would otherwise be quoting a
 * rolling window and a calendar one and calling them the same thing.
 */
export const DONATION_MONTH_DAYS = 30;

/**
 * The earliest day still inside a window that rolls back from today.
 *
 * Both ends count, so a window of 365 days reaches back 364 and includes today.
 *
 * @param today - The current day, as `YYYY-MM-DD`.
 * @param days - How long the window is, counting today as one of them.
 * @returns The first day of the window, as `YYYY-MM-DD`.
 */
export function periodStart(today: string, days: number): string {
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days + 1);
  return day.toISOString().slice(0, 10);
}

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
