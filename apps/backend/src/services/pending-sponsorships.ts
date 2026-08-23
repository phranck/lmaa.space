import { randomBytes } from "node:crypto";

import type { PendingSponsorshipInput } from "@lmaa/contracts";
import { buildCreditorReference, classifyProfileLink, randomReferenceBody } from "@lmaa/shared";

import { resolveSponsorAvatar } from "./sponsor-avatar.js";
import { getSponsoringConfig } from "./sponsors.js";
import type { PendingSponsorshipRow, SponsorRow } from "../db/schema.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { logger } from "../lib/logger.js";
import { type Result, failure, success } from "../lib/result.js";
import {
  deletePendingSponsorship,
  getPendingSponsorship,
  insertPendingSponsorship,
} from "../repositories/pending-sponsorships.js";
import { insertSponsor } from "../repositories/sponsors.js";

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
 * How many times a taken reference is redrawn before the attempt is given up.
 *
 * At 60 bits a collision is a fault rather than an event, so three attempts is
 * not a probability calculation. It is what stops a broken draw, such as one
 * returning a constant, from spinning against the database.
 */
const REFERENCE_ATTEMPTS = 3;

/** The unique constraint that holds one entry per reference. */
const REFERENCE_UNIQUE_CONSTRAINT = "pending_sponsorships_reference_unique";

/**
 * Draws one reference, being `RF`, its two check digits, the prefix, and chance.
 *
 * @returns The reference as it travels, without the spaces it is printed with.
 */
function drawReference(): string {
  const drawn = randomReferenceBody(REFERENCE_RANDOM_LENGTH, (size) => randomBytes(size));
  return buildCreditorReference(`${REFERENCE_PREFIX}${drawn}`);
}

/**
 * Takes what somebody said about themselves and answers with their reference.
 *
 * The address is sorted into the service it belongs to here rather than in the
 * form, so the site stores the same `socialMedia` map a sponsor already carries
 * and nothing has to be merged when the entry is taken over.
 *
 * No picture is fetched at this point. The route this runs behind is open to
 * anybody, and resolving an address given by a stranger would make it a way to
 * have this server fetch whatever the caller names.
 *
 * The announced amount is measured against the minimum here and nowhere else
 * that matters. The form checks it too, but the form runs in a browser the
 * caller owns: what decides whether an entry exists is this comparison against
 * the figure the operator set in the dashboard.
 *
 * @param input - The form as it was validated.
 * @returns The stored row, `amount_too_low` when what was announced falls short
 *   of what a sponsorship costs, `link_unusable` when an address was given that
 *   names nothing reachable, or `reference_unavailable` when every drawn
 *   reference was already taken, which means the draw is broken rather than
 *   unlucky.
 */
export async function createPendingSponsorship(
  input: PendingSponsorshipInput,
): Promise<
  Result<
    { pending: PendingSponsorshipRow },
    "amount_too_low" | "link_unusable" | "reference_unavailable"
  >
> {
  const { minAmountCents } = await getSponsoringConfig();
  if (input.amountCents < minAmountCents) return failure("amount_too_low");

  const classified = input.link ? classifyProfileLink(input.link) : null;
  // An address that sorts into nothing is said so rather than dropped. Storing
  // the entry without it would leave somebody believing they had given it.
  if (input.link && !classified) return failure("link_unusable");

  const socialMedia = classified ? { [classified.platform]: classified.url } : {};

  for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt++) {
    try {
      const pending = await insertPendingSponsorship({
        reference: drawReference(),
        firstName: input.firstName,
        lastName: input.lastName,
        socialMedia,
        claim: input.claim,
        amountCents: input.amountCents,
        published: input.published,
      });
      return success({ pending });
    } catch (error) {
      if (!isUniqueViolation(error, REFERENCE_UNIQUE_CONSTRAINT)) throw error;
      // Neither the reference nor anything the caller typed goes in here.
      logger.warn(
        { event: "pending_sponsorship.reference_taken", attempt },
        "A drawn creditor reference was already taken",
      );
    }
  }

  return failure("reference_unavailable");
}

/**
 * Turns one pending entry into a sponsor and removes the entry.
 *
 * The picture is looked for here rather than when the form was filled in,
 * because the form stands behind a route open to anybody and resolving an
 * address given by a stranger would make this server fetch whatever they name.
 * By this point the operator has read the entry and seen the money arrive.
 *
 * What the entry says about the person is taken as given: the name, the
 * address, the sentence and the answer about being named are theirs. What they
 * paid and when is not in the entry at all and comes from the statement.
 *
 * @param id - The pending entry to take over.
 * @param payment - What arrived, in cents, and the day it did as `YYYY-MM-DD`.
 * @returns The sponsor as stored, or `not_found` when the entry is gone.
 */
export async function takeOverPendingSponsorship(
  id: string,
  payment: { amountCents: number; paidAt: string },
): Promise<Result<{ sponsor: SponsorRow }, "not_found">> {
  const pending = await getPendingSponsorship(id);
  if (!pending) return failure("not_found");

  const imageUrl = await resolveSponsorAvatar(pending.socialMedia);

  const sponsor = await insertSponsor({
    firstName: pending.firstName,
    lastName: pending.lastName,
    socialMedia: pending.socialMedia,
    imageUrl: imageUrl ?? "",
    claim: pending.claim,
    published: pending.published,
    amountCents: payment.amountCents,
    paidAt: payment.paidAt,
  });

  // Removed only once the sponsor is written, so a failure above leaves the
  // entry standing and the operator can try again rather than losing what
  // somebody typed.
  await deletePendingSponsorship(id);

  logger.info(
    { event: "pending_sponsorship.taken_over", sponsorId: sponsor.id },
    "A pending sponsorship became a sponsor",
  );

  return success({ sponsor });
}
