import { z } from "zod";

import { socialMediaSchema } from "@lmaa/shared";

/**
 * The people who carry the running costs for a year.
 *
 * A sponsor's year runs from the day they paid, not from January, so the list
 * on the site is simply everybody whose year has not yet run out. That needs no
 * rollover and no cleanup: a sponsor drops out on their own anniversary and the
 * others move up.
 */

/** Everything an editor records about one sponsor. */
export const sponsorInputSchema = z.object({
  /** The given name, which is the one the site leads with. */
  firstName: z.string().trim().min(1).max(80),
  /**
   * The family name, which stays empty for anybody who wants only their first
   * name or a single-word alias on the page.
   */
  lastName: z.string().trim().max(80).default(""),
  /**
   * Where they can be found, as a platform key against a profile address.
   *
   * The same map the shops carry, so a pasted address is recognised and stored
   * canonically rather than as whatever form it was written in.
   */
  socialMedia: socialMediaSchema,
  /** An address of the picture. Empty means no picture is shown. */
  imageUrl: z.string().trim().max(500).default(""),
  /** Their own sentence about why they did it. Optional, as it should be. */
  claim: z.string().trim().max(600).default(""),
  /**
   * What they gave, in cents.
   *
   * Kept because the site needs the sum to say whether the year is covered. It
   * is never shown next to a name: a visible amount turns a list of people into
   * a ranking, and the person at the bottom is publicly at the bottom.
   */
  amountCents: z.coerce.number().int().min(0).max(1_000_000),
  /** The day they paid, which starts their year. */
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD"),
});

/** A sponsor as stored and read back. */
export const sponsorSchema = sponsorInputSchema.extend({
  id: z.string().min(1).max(64),
  /** Always a map when read back, because the column holds `{}` when empty. */
  socialMedia: z.record(z.string(), z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A sponsor as the site shows them, without the amount. */
export const publicSponsorSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  socialMedia: z.record(z.string(), z.string()),
  imageUrl: z.string(),
  claim: z.string(),
  paidAt: z.string(),
});

/** One line of what the year costs. */
export const runningCostItemSchema = z.object({
  /** What it is, such as "Domain" or "Web-Hosting". */
  label: z.string().trim().min(1).max(120),
  /** What it costs for a year, in cents. */
  amountCents: z.coerce.number().int().min(0).max(10_000_000),
});

/** What the year costs, itemised, and what it takes to be named. */
export const sponsoringConfigSchema = z.object({
  costs: z.array(runningCostItemSchema).max(20).default([]),
  /**
   * The least a sponsor gives to be named for a year.
   *
   * A number rather than a share of the costs, because it has to be sayable in
   * one sentence and stay the same when a hosting bill moves.
   */
  minAmountCents: z.coerce.number().int().min(0).max(1_000_000).default(4000),
});

/** What the site needs to draw the sponsors and say what is covered. */
export const sponsorsPayloadSchema = z.object({
  sponsors: z.array(publicSponsorSchema),
  /** The sum of the year's costs, in cents. */
  costsTotalCents: z.number().int(),
  /** What the current sponsors together have covered, in cents. */
  coveredCents: z.number().int(),
  minAmountCents: z.number().int(),
});

/** Everything an editor records about one sponsor. */
export type SponsorInput = z.infer<typeof sponsorInputSchema>;
/** A sponsor as stored and read back. */
export type Sponsor = z.infer<typeof sponsorSchema>;
/** A sponsor as the site shows them. */
export type PublicSponsor = z.infer<typeof publicSponsorSchema>;
/** One line of what the year costs. */
export type RunningCostItem = z.infer<typeof runningCostItemSchema>;
/** What the year costs and what it takes to be named. */
export type SponsoringConfig = z.infer<typeof sponsoringConfigSchema>;
/** What the site needs to draw the sponsors. */
export type SponsorsPayload = z.infer<typeof sponsorsPayloadSchema>;

/** The configuration in force when nothing has been set. */
export const SPONSORING_DEFAULTS: SponsoringConfig = sponsoringConfigSchema.parse({});
