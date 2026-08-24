/**
 * Country names, read from a two-letter code.
 *
 * The names come from the platform through `Intl.DisplayNames`, so nothing here
 * carries a list that would have to be kept current.
 */

import type { FormatLocale } from "./datetime.js";

/**
 * One reader per language, built once at module scope.
 *
 * The call that reads a name is also the call that builds the reader, so
 * constructing one per rendered address is the expensive way to name a country.
 */
const REGION_NAMES: Record<FormatLocale, Intl.DisplayNames> = {
  de: new Intl.DisplayNames(["de"], { type: "region" }),
  en: new Intl.DisplayNames(["en"], { type: "region" }),
};

/**
 * Names the country a code stands for.
 *
 * A code the platform does not recognise comes back unchanged, and so does one
 * that is not a country code at all. `Intl.DisplayNames` throws a `RangeError`
 * on anything malformed, which on a page rendering a stored address would stop
 * the render over one bad row.
 *
 * @param code - A two-letter country code, such as `DE`.
 * @param locale - The language to name it in. German by default.
 * @returns The country name, or the code itself.
 */
export function countryName(code: string, locale: FormatLocale = "de"): string {
  if (!code) return "";
  try {
    return REGION_NAMES[locale].of(code) ?? code;
  } catch {
    return code;
  }
}
