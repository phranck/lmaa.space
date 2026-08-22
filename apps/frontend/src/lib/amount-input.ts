/**
 * Cleans up what a visitor types into a free amount field.
 *
 * The field accepts an amount, not a number in a particular notation, so it
 * takes whatever people actually type and turns it into one shape: digits, a
 * comma, and at most two decimals. Everything else is dropped whilst it is
 * typed, which means the field never holds a value the rest of the page cannot
 * read.
 */

/** Digits after the decimal separator that a currency amount may carry. */
const DECIMAL_PLACES = 2;

/** Digits in one group when a separator is used for grouping, as in 1.000. */
const GROUP_SIZE = 3;

/**
 * Decides which of the separators in `digitsAndSeparators` divides the euros
 * from the cents, and removes the rest.
 *
 * A comma is always a decimal separator here, because that is the notation of
 * the locale the page is written in. A full stop is one only where no comma is
 * present and it is not grouping three digits, so `33.33` is thirty-three euros
 * and thirty-three cents whilst `1.000` is a thousand.
 *
 * @param value - Digits, commas, and full stops, in the order they were typed.
 * @returns The euros and the cents, with the cents empty when none were typed.
 */
function splitAmount(value: string): { euros: string; cents: string } {
  const lastComma = value.lastIndexOf(",");
  const lastStop = value.lastIndexOf(".");

  let decimalAt = -1;
  if (lastComma >= 0) {
    decimalAt = lastComma;
  } else if (lastStop >= 0) {
    const following = value.length - lastStop - 1;
    if (following !== GROUP_SIZE) decimalAt = lastStop;
  }

  const stripSeparators = (part: string) => part.replace(/[.,]/g, "");
  if (decimalAt < 0) return { euros: stripSeparators(value), cents: "" };

  return {
    euros: stripSeparators(value.slice(0, decimalAt)),
    cents: stripSeparators(value.slice(decimalAt + 1)),
  };
}

/**
 * Normalises a typed amount to the notation the page uses.
 *
 * Whitespace, currency symbols, and letters are removed, grouping separators
 * are dropped, the decimal separator becomes a comma, and the cents are cut to
 * two digits. A trailing comma survives, because somebody who has just typed
 * `33,` is about to type the cents and the field must not fight them.
 *
 * @param raw - Exactly what the field currently holds.
 * @returns The cleaned value, empty when nothing usable was typed.
 */
export function normalizeAmountInput(raw: string): string {
  const kept = raw.replace(/[^\d.,]/g, "");
  if (kept === "") return "";

  const { euros, cents } = splitAmount(kept);

  // A single leading zero stays, so `0,50` is typeable, whilst `007` is not.
  const wholePart = euros.replace(/^0+(?=\d)/, "");
  const endsOnSeparator = /[.,]$/.test(kept);

  if (cents === "" && !endsOnSeparator) return wholePart;

  const centsPart = cents.slice(0, DECIMAL_PLACES);
  return `${wholePart === "" ? "0" : wholePart},${centsPart}`;
}

/**
 * Reads a normalised amount as a number.
 *
 * @param value - A value that came out of `normalizeAmountInput`.
 * @returns The amount in euros, or `null` when the field holds no usable one.
 */
export function readAmountInput(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
