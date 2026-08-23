/**
 * The ISO 11649 creditor reference.
 *
 * A payment carries either a sentence or a reference, never both, and a
 * reference is the half that survives the journey: the QR standard marks it as
 * not to be altered by the payer, its alphabet is a strict subset of what every
 * bank in SEPA must carry, and its two check digits say on arrival whether it
 * came through intact.
 *
 * The check digits are the only computed part. Everything after them is chosen
 * by whoever issues the reference, which is what lets one open with a word the
 * payee recognises on a statement.
 */

/** Letters and digits, in the order ISO 11649 clause 5 permits them. */
const REFERENCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** What follows `RF` and the two check digits, at most, per ISO 11649 clause 5. */
export const MAX_CREDITOR_REFERENCE_BODY = 21;

/** The finished reference, being `RF`, two check digits, and the body. */
export const MAX_CREDITOR_REFERENCE = 4 + MAX_CREDITOR_REFERENCE_BODY;

/** Only letters and digits, with no separator or punctuation between them. */
const BODY_PATTERN = /^[A-Za-z0-9]+$/;

/** A finished reference, as it travels: no spaces, upper or lower case body. */
const REFERENCE_PATTERN = /^RF[0-9]{2}[A-Za-z0-9]{1,21}$/;

/**
 * Turns a reference into the number ISO/IEC 7064 works on.
 *
 * Each letter stands for a two-digit number, A being 10 through Z being 35, and
 * case does not matter. The result is far too large for a JavaScript number, so
 * the remainder is taken digit by digit as the string is walked.
 *
 * @param value - The characters to convert.
 * @returns The remainder modulo 97.
 */
function remainderMod97(value: string): number {
  let remainder = 0;
  for (const character of value) {
    const digits = /[A-Za-z]/.test(character)
      ? String(character.toUpperCase().charCodeAt(0) - 55)
      : character;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder;
}

/**
 * Builds a creditor reference around a body of your own choosing.
 *
 * @param body - Letters and digits, at most 21 of them, without separators.
 * @returns The finished reference, such as `RF18SPON26001`.
 * @throws RangeError when the body is empty, too long, or carries anything but
 *   letters and digits.
 */
export function buildCreditorReference(body: string): string {
  if (body.length === 0 || body.length > MAX_CREDITOR_REFERENCE_BODY) {
    throw new RangeError(
      `A creditor reference body holds 1 to ${MAX_CREDITOR_REFERENCE_BODY} characters.`,
    );
  }
  if (!BODY_PATTERN.test(body)) {
    throw new RangeError("A creditor reference body holds letters and digits only.");
  }

  // ISO 11649 clause 6: append `RF00`, take the remainder, and the check digits
  // are 98 less it.
  const check = 98 - remainderMod97(`${body}RF00`);
  return `RF${String(check).padStart(2, "0")}${body}`;
}

/**
 * Says whether a reference is one we could have issued and is undamaged.
 *
 * @param reference - The reference as it arrived, spaces allowed.
 * @returns `true` when the shape and the check digits both hold.
 */
export function isValidCreditorReference(reference: string): boolean {
  const compact = reference.replace(/\s+/g, "");
  if (!REFERENCE_PATTERN.test(compact)) return false;
  // Clause 6 again: move the first four characters to the end, and a sound
  // reference leaves a remainder of one.
  return remainderMod97(`${compact.slice(4)}${compact.slice(0, 4)}`) === 1;
}

/**
 * The body of a reference, which is what identifies the record behind it.
 *
 * @param reference - The reference as it arrived, spaces allowed.
 * @returns The body, or `null` when the reference does not hold up.
 */
export function creditorReferenceBody(reference: string): string | null {
  const compact = reference.replace(/\s+/g, "");
  return isValidCreditorReference(compact) ? compact.slice(4) : null;
}

/**
 * Groups a reference into fours, which is how ISO 11649 Annex A prints one.
 *
 * The spaces are presentation and are not part of the value, so anything
 * reading a reference back strips them first.
 *
 * @param reference - The reference, with or without spaces.
 * @returns The reference in groups of four, such as `RF18 SPON 2600 1`.
 */
export function formatCreditorReference(reference: string): string {
  return reference
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * Draws a body of random letters and digits.
 *
 * @param length - How many characters to draw.
 * @param randomValues - Filled with cryptographically secure bytes.
 * @returns The drawn characters.
 */
export function randomReferenceBody(
  length: number,
  randomValues: (size: number) => Uint8Array,
): string {
  const alphabet = REFERENCE_ALPHABET;
  // Rejection sampling, so every character of the alphabet is equally likely.
  // Taking a byte modulo 62 would favour the first 8 of them.
  const ceiling = Math.floor(256 / alphabet.length) * alphabet.length;
  let drawn = "";

  while (drawn.length < length) {
    for (const byte of randomValues(length)) {
      if (byte >= ceiling) continue;
      drawn += alphabet[byte % alphabet.length];
      if (drawn.length === length) break;
    }
  }

  return drawn;
}
