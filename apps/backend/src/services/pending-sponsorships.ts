import { randomBytes } from "node:crypto";

import { PENDING_SPONSORSHIP_DAYS, type PendingSponsorshipInput } from "@lmaa/contracts";
import {
  buildCreditorReference,
  classifyProfileLink,
  normalizeCreditorReference,
  normalizeSocialMediaValue,
  randomReferenceBody,
  type SocialPlatformKey,
} from "@lmaa/shared";

import { resolveSponsorAvatar } from "./sponsor-avatar.js";
import { getSponsoringConfig } from "./sponsors.js";
import type { PendingSponsorshipInsert, PendingSponsorshipRow, SponsorRow } from "../db/schema.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { logger } from "../lib/logger.js";
import { detectPlatformFromHost } from "../lib/og.js";
import { type Result, failure, success } from "../lib/result.js";
import {
  deletePendingSponsorship,
  deletePendingSponsorshipsBefore,
  getPendingSponsorship,
  insertPendingSponsorship,
  updatePendingSponsorshipByReference,
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
/** What both writing paths refuse a form for, before anything is stored. */
type FormRefusal = "amount_too_low" | "link_unusable";

/**
 * Turns a validated form into the columns of a row, or says why it cannot.
 *
 * Shared by the two writing paths, so announcing and correcting are measured
 * against the same figure and sort an address the same way. A rule that held on
 * one of them and not the other is a rule that does not hold.
 */
async function toStoredFields(
  input: PendingSponsorshipInput,
): Promise<
  Result<{ fields: Omit<PendingSponsorshipInsert, "id" | "reference" | "createdAt"> }, FormRefusal>
> {
  const { minAmountCents } = await getSponsoringConfig();
  if (input.amountCents < minAmountCents) return failure("amount_too_low");

  const classified = input.link ? classifyProfileLink(input.link) : null;
  // An address that sorts into nothing is said so rather than dropped. Storing
  // the entry without it would leave somebody believing they had given it.
  if (input.link && !classified) return failure("link_unusable");

  const sorted = classified ? await refineWebsite(classified) : null;

  return success({
    fields: {
      firstName: input.firstName,
      lastName: input.lastName,
      socialMedia: sorted ? [sorted] : [],
      claim: input.claim,
      amountCents: input.amountCents,
      published: input.published,
    },
  });
}

/**
 * Asks the page what it is, where its address could not say.
 *
 * A service anybody can host sits on a domain of its own and its profiles are a
 * single path segment, which is what a personal website looks like too. So an
 * address on one of them sorts into `website`, and only the host can put that
 * right, by saying through NodeInfo which software it runs.
 *
 * A host that answers nothing, or that runs something not known here, is left
 * as the website it was taken for.
 *
 * @param classified - What the address sorted into by its shape alone.
 * @returns The same, or the service the page turned out to belong to.
 */
async function refineWebsite(classified: {
  platform: SocialPlatformKey;
  url: string;
}): Promise<{ platform: SocialPlatformKey; url: string }> {
  if (classified.platform !== "website") return classified;

  const named = await detectPlatformFromHost(classified.url);
  if (!named) return classified;

  const url = normalizeSocialMediaValue(named as SocialPlatformKey, classified.url);
  return url ? { platform: named as SocialPlatformKey, url } : classified;
}

export async function createPendingSponsorship(
  input: PendingSponsorshipInput,
): Promise<Result<{ pending: PendingSponsorshipRow }, FormRefusal | "reference_unavailable">> {
  const prepared = await toStoredFields(input);
  if (!prepared.ok) return prepared;

  for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt++) {
    try {
      const pending = await insertPendingSponsorship({
        reference: drawReference(),
        ...prepared.fields,
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
 * Rewrites an entry somebody has already announced, keeping their reference.
 *
 * Whoever holds the reference may change what stands behind it. That is the
 * same trust the reference already carries: it is theirs, it is not guessable,
 * and it addresses nothing but their own row.
 *
 * The reference itself is never reissued, because by this point it may already
 * be written into a banking app and a new one would leave that payment pointing
 * at nothing.
 *
 * @param reference - The reference as it arrived, spaces and any case allowed.
 * @param input - The form as it was validated.
 * @returns The row afterwards, or why it was refused.
 */
export async function updatePendingSponsorship(
  reference: string,
  input: PendingSponsorshipInput,
): Promise<Result<{ pending: PendingSponsorshipRow }, FormRefusal | "not_found">> {
  const stored = normalizeCreditorReference(reference);
  if (!stored) return failure("not_found");

  const prepared = await toStoredFields(input);
  if (!prepared.ok) return prepared;

  const pending = await updatePendingSponsorshipByReference(stored, prepared.fields);
  if (!pending) return failure("not_found");

  return success({ pending });
}

/** A day in milliseconds, which is what the lifetime is counted in. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How often the entries nobody claimed are looked at.
 *
 * Once a day is often enough for a lifetime measured in weeks, and it is run
 * once at start-up as well, so a service that is restarted more often than this
 * still clears what it should.
 */
const EXPIRY_INTERVAL_MS = DAY_MS;

/**
 * Removes what nobody turned into a sponsor within the time it was given.
 *
 * These rows hold a name, an address and a sentence somebody wrote about
 * themselves. They were given for a payment that never arrived, so there is no
 * reason left to hold them, and personal data nobody claimed does not sit
 * around waiting to be forgotten by accident.
 *
 * @param now - The moment to measure against.
 * @returns How many were removed.
 */
export async function expirePendingSponsorships(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PENDING_SPONSORSHIP_DAYS * DAY_MS);
  const removed = await deletePendingSponsorshipsBefore(cutoff);

  if (removed > 0) {
    // The count and nothing else: what was in those rows is exactly what is
    // being got rid of.
    logger.info(
      { event: "pending_sponsorship.expired", removed, days: PENDING_SPONSORSHIP_DAYS },
      "Unclaimed sponsorship announcements removed",
    );
  }

  return removed;
}

/**
 * Starts the daily sweep, and runs one at once.
 *
 * @returns The timer, so shutting down can stop it.
 */
export function startPendingSponsorshipExpiry(): NodeJS.Timeout {
  const sweep = () => {
    void expirePendingSponsorships().catch((error) => {
      logger.error({ err: error }, "pending sponsorship expiry failed");
    });
  };

  sweep();
  const timer = setInterval(sweep, EXPIRY_INTERVAL_MS);
  logger.info(
    { intervalMs: EXPIRY_INTERVAL_MS, days: PENDING_SPONSORSHIP_DAYS },
    "pending sponsorship expiry started",
  );
  return timer;
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
