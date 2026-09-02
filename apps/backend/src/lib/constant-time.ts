import { timingSafeEqual } from "node:crypto";

/**
 * Compares a presented secret against the expected one without letting the
 * time taken say how far the two matched.
 *
 * @param presented - What the caller sent.
 * @param expected - What this side holds.
 * @returns `true` only when both are byte for byte the same.
 *
 * @remarks
 * One helper for every such comparison in this backend, so a second call site
 * cannot quietly become an `===`. The length check in front of the comparison
 * is required rather than an optimisation: `timingSafeEqual` throws when the
 * two buffers differ in length. A length is the one thing this does leak, and
 * every secret it is used on has a fixed one.
 */
export function equalsInConstantTime(presented: string, expected: string): boolean {
  const presentedBytes = Buffer.from(presented, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (presentedBytes.length !== expectedBytes.length) return false;

  return timingSafeEqual(presentedBytes, expectedBytes);
}
