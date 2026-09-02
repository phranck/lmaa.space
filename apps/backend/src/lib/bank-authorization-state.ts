import { equalsInConstantTime } from "./constant-time.js";

/** What the match needs of a stored authorisation, and no more. */
export interface AuthorizationStateCandidate {
  /** The value that was issued, as hex. */
  state: string;
  /** The moment after which it no longer counts. */
  expiresAt: Date;
}

/**
 * Picks the stored authorisation a return belongs to, if any does.
 *
 * @param candidates - Every authorisation the table holds.
 * @param presented - The value the bank handed back.
 * @param now - The moment to judge expiry against.
 * @returns The one that matches and has not expired, or `null`.
 *
 * @remarks
 * Every candidate is compared, and each comparison is constant-time, so
 * neither the time taken nor the number of comparisons says how far a guessed
 * value got. The table holds an authorisation only whilst one is in flight,
 * which is what keeps comparing all of them cheap.
 *
 * Expiry is decided here rather than in the query that loaded the rows, so
 * there is one answer to when an authorisation has run out and it is one a test
 * can put a clock in front of.
 */
export function matchAuthorizationState<Candidate extends AuthorizationStateCandidate>(
  candidates: Candidate[],
  presented: string,
  now: Date,
): Candidate | null {
  let matched: Candidate | null = null;

  for (const candidate of candidates) {
    const isCurrent = candidate.expiresAt.getTime() > now.getTime();
    if (isCurrent && equalsInConstantTime(presented, candidate.state)) matched = candidate;
  }

  return matched;
}
