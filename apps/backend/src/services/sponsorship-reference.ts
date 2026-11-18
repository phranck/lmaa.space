import { randomBytes } from "node:crypto";

import { buildCreditorReference, randomReferenceBody } from "@lmaa/shared";

/**
 * The shape of the creditor reference the sponsor form issues, in one place.
 *
 * Drawing a reference and recognizing one on a bank statement are two sides of
 * the same rule, so both live here. The account the money arrives in is shared
 * with other projects, and the shape is what tells this project's reference
 * apart from theirs before anything is looked up.
 */

/**
 * What every reference opens with, so a statement says what the payment is.
 *
 * The prefix is the same for everybody and is therefore worth nothing against
 * guessing. It buys the payee a word on the bank statement, which is what the
 * free text would have carried had a reference left room for one.
 */
const REFERENCE_PREFIX = "SPON";

/**
 * How many drawn characters follow the prefix.
 *
 * `REFERENCE_BODY_ALPHABET` holds 32 characters, so each one is worth 5 bits and
 * twelve of them are 60 bits, or 1.15e18 references. The reference addresses a
 * private record, so it is sized against being guessed rather than against two
 * of them colliding, and 60 bits is far past what a rate-limited endpoint could
 * be walked through.
 *
 * Twelve rather than the 17 that would fill an ISO 11649 reference, because the
 * whole thing then prints as five clean groups of four and somebody typing it
 * into a banking app by hand has 20 characters to get right instead of 25.
 */
const REFERENCE_RANDOM_LENGTH = 12;

/**
 * A stored reference this project issued: head, prefix, and the drawn part.
 *
 * Upper case and without spaces, which is the form `normalizeCreditorReference`
 * returns. The drawn part is matched against the letters and digits ISO 11649
 * allows rather than the narrower drawing alphabet, so the check stays a test of
 * shape and the check digits stay the test of integrity.
 */
const ISSUED_REFERENCE_PATTERN = new RegExp(
  `^RF[0-9]{2}${REFERENCE_PREFIX}[0-9A-Z]{${REFERENCE_RANDOM_LENGTH}}$`,
);

/**
 * Draws one reference, being `RF`, its two check digits, the prefix, and chance.
 *
 * @returns The reference as it travels, without the spaces it is printed with.
 */
export function drawSponsorshipReference(): string {
  const drawn = randomReferenceBody(REFERENCE_RANDOM_LENGTH, (size) => randomBytes(size));
  return buildCreditorReference(`${REFERENCE_PREFIX}${drawn}`);
}

/**
 * Says whether a reference has the shape this project issues.
 *
 * @param reference - A reference as `normalizeCreditorReference` returns it:
 *   upper case, no spaces, check digits already verified.
 * @returns `true` when it opens with `RF`, two digits and `SPON`, and carries
 *   exactly `REFERENCE_RANDOM_LENGTH` drawn characters after them. A reference
 *   another payee issued, such as musiccloud's `MCSP` references, returns
 *   `false`. So does one with this prefix and another length, because the form
 *   never drew one.
 *
 * @remarks
 * A shape that matches says only that this project could have issued the
 * reference. Whether it did is a lookup, which the bank import makes before it
 * books anything.
 */
export function isSponsorshipReferenceShape(reference: string): boolean {
  return ISSUED_REFERENCE_PATTERN.test(reference);
}
