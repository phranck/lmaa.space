/**
 * Returns whether `value` can be used as an email recipient for the mail provider.
 *
 * The provider (Resend) rejects an empty or malformed `to` with a `422
 * validation_error`. Optional recipient fields (e.g. a blank "your email"
 * field on a public form) resolve to an empty value, so callers must guard
 * against that and skip sending rather than surface a provider error.
 *
 * The check is intentionally lenient: it only rules out empty/whitespace and
 * obviously non-address values. It accepts both the bare `email@example.com`
 * and the `Name <email@example.com>` forms the provider supports; the provider
 * performs the strict validation.
 *
 * @param value - Candidate recipient (field value or configured fallback).
 * @returns `true` if the value looks like a usable recipient address.
 */
export function isEmailRecipient(value: string | undefined | null): boolean {
  return typeof value === "string" && /.+@.+/.test(value.trim());
}
