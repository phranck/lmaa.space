/**
 * Money, written the one way this project writes it.
 *
 * The site is Austrian by address and German by author, and the two locales
 * disagree about where the symbol goes: `de-AT` writes `€ 226,00` whilst
 * `de-DE` writes `226,00 €`. Stated by phranck on 2026-08-23: the German form,
 * everywhere.
 *
 * It lives here rather than beside each surface because it had begun to
 * disagree with itself. Two of the four formatters on the site said Austrian and
 * two said German, and nothing held them together.
 */

/** The one locale every amount is written in. */
const MONEY_LOCALE = "de-DE";

/**
 * Formatters built once at module scope.
 *
 * The call that formats is also the call that builds, so constructing one per
 * rendered amount is the expensive way to write a number.
 */
const EURO_EXACT = new Intl.NumberFormat(MONEY_LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const EURO_WHOLE = new Intl.NumberFormat(MONEY_LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * The currency symbol, taken from the formatter rather than typed out.
 *
 * A field that shows the symbol beside itself then cannot drift from the
 * amounts printed next to it.
 */
export const EURO_SYMBOL =
  EURO_WHOLE.formatToParts(0).find((part) => part.type === "currency")?.value ?? "€";

/**
 * Writes an amount given in euro, with its cents.
 *
 * @param euros - The amount, in euro.
 * @returns The amount as `226,00 €`.
 */
export function formatEuro(euros: number): string {
  return EURO_EXACT.format(euros);
}

/**
 * Writes an amount given in euro, without its cents.
 *
 * For a figure that has none and reads better without them, such as a suggested
 * amount or a total somebody is being asked to picture.
 *
 * @param euros - The amount, in euro.
 * @returns The amount as `226 €`.
 */
export function formatEuroWhole(euros: number): string {
  return EURO_WHOLE.format(euros);
}

/**
 * Writes an amount held in cents, which is how every amount is stored.
 *
 * @param cents - The amount, in cents.
 * @returns The amount as `226,00 €`.
 */
export function formatEuroCents(cents: number): string {
  return formatEuro(cents / 100);
}
