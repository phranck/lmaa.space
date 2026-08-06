/**
 * Upper bound for a recipient value, covering the RFC 5321 maximum of a 64
 * character local part, the `@`, and a 255 character domain, plus room for an
 * optional display name.
 */
const MAX_RECIPIENT_LENGTH = 320;

/**
 * Characters that must never appear in a value that becomes a mail header.
 * CR and LF are the ones that would let a submitted value open a second header;
 * the remaining C0 range and DEL have no legitimate use here either.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * A single bare address. The excluded characters are those that would either
 * separate addresses (`,` `;`), introduce a display-name form (`<` `>` `"`), or
 * end the token (whitespace). Requiring a dot in the domain rules out bare host
 * names, which this application never sends to.
 */
const BARE_ADDRESS = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

/** Splits `Display Name <local@domain>` into its two parts. */
const DISPLAY_NAME_FORM = /^(.*)<([^<>]*)>$/;

/**
 * Extracts the bare address from a recipient value.
 *
 * Accepts both `local@domain` and `Display Name <local@domain>`, because the
 * mail provider supports either. Returns the address without the display name
 * so callers can log or compare it.
 *
 * @param value - Candidate recipient, typically a submitted field value or a configured fallback.
 * @returns The bare address, or `null` when the value is not exactly one usable address.
 *
 * @remarks
 * Rejects, rather than sanitises, anything carrying a control character. A
 * submitted value reaches the provider as a header, so a value containing CR or
 * LF must never be repaired into something sendable; the only safe answer is to
 * refuse it.
 */
export function extractRecipientAddress(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_RECIPIENT_LENGTH) return null;
  if (CONTROL_CHARACTERS.test(trimmed)) return null;

  const displayNameMatch = trimmed.match(DISPLAY_NAME_FORM);
  if (!displayNameMatch) {
    return BARE_ADDRESS.test(trimmed) ? trimmed : null;
  }

  const address = displayNameMatch[2].trim();
  return BARE_ADDRESS.test(address) ? address : null;
}

/**
 * Returns whether `value` is exactly one address usable as a mail recipient or
 * as a `Reply-To` value.
 *
 * @param value - Candidate address (field value or configured fallback).
 * @returns `true` when the value is a single, well-formed address.
 *
 * @remarks
 * Optional recipient fields, such as a blank "your email" field on a public
 * form, resolve to an empty value. Callers must treat `false` as "skip sending"
 * rather than as a provider error.
 */
export function isEmailRecipient(value: string | undefined | null): boolean {
  return extractRecipientAddress(value) !== null;
}
