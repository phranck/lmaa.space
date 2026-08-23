/**
 * Money on the sponsor screens.
 *
 * Built once at module scope rather than per render, because a formatter is
 * expensive to construct and this one never varies: the site states its running
 * costs in euro, so the dashboard that records them does too.
 */
const EURO = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/**
 * Writes an amount held in cents as euro.
 *
 * @param cents - The amount, in cents.
 * @returns The amount as `1.234,00 €`.
 */
export function formatEuro(cents: number): string {
  return EURO.format(cents / 100);
}
