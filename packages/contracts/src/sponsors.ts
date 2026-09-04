import { z } from "zod";

import {
  MAX_REMITTANCE_UNSTRUCTURED,
  socialMediaLinksSchema,
  socialMediaSchema,
} from "@lmaa/shared";

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
   * Whether they want to be named on the site.
   *
   * What they gave counts towards the year either way. Only the name is
   * withheld, because somebody may carry the costs without wanting to be seen
   * doing it.
   */
  published: z.boolean().default(true),
  /** The day they paid, which starts their year. */
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD"),
});

/** A sponsor as stored and read back. */
export const sponsorSchema = sponsorInputSchema.extend({
  id: z.string().min(1).max(64),
  /** Always a list when read back, empty where nothing was entered. */
  socialMedia: socialMediaLinksSchema,
  /**
   * What they have given, in cents, summed from the payments linked to them.
   *
   * Read only, and absent from the input schema above, because a sponsorship is
   * a person and a payment is an event in the ledger. Editing the figure here
   * would put the same amount in two places, and the whole reason the ledger
   * exists is that it is the only place a payment is recorded.
   *
   * Never shown next to a name on the site: a visible amount turns a list of
   * people into a ranking, and the person at the bottom is publicly at the
   * bottom.
   */
  amountCents: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A sponsor as the site shows them, without the amount. */
export const publicSponsorSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  socialMedia: socialMediaLinksSchema,
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
  /**
   * Who is paid, as the transfer names them.
   *
   * Held here rather than in the page, because the same three lines are read by
   * the transfer card, encoded into the GiroCode, and named in sentences across
   * the site. Two places would disagree eventually and nothing would say which
   * one the money followed.
   */
  payeeName: z.string().trim().max(70).default(""),
  /** The account, without its printed spaces. Empty until one is entered. */
  payeeIban: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => value === "" || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value), {
      message: "Expected an IBAN",
    })
    .default(""),
  /** The bank, which a payee inside the EEA need not supply. */
  payeeBic: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => value === "" || /^[A-Z0-9]{8,11}$/.test(value), {
      message: "Expected a BIC",
    })
    .default(""),
  /**
   * What a plain donation carries as its remittance text.
   *
   * Bounded by what the GiroCode can hold, so a value too long to be encoded is
   * refused where it is typed rather than discovered by whoever scans it.
   */
  purposeDonation: z.string().trim().max(MAX_REMITTANCE_UNSTRUCTURED).default("Spende: lmaa.space"),
  /** The same for a payment large enough to earn a sponsorship. */
  purposeSponsor: z.string().trim().max(MAX_REMITTANCE_UNSTRUCTURED).default("Sponsor: lmaa.space"),
  /**
   * What a PayPal donor is asked to write into their note.
   *
   * Shorter than the two above on purpose. The GiroCode writes its text by
   * itself, whilst this one is typed by a person on a telephone, and every
   * character there is one they have to get right. The same account carries
   * several projects, which is what the note tells apart.
   */
  purposePaypal: z.string().trim().max(MAX_REMITTANCE_UNSTRUCTURED).default("lmaa.space"),
});

/** What the site needs to draw the sponsors and say what is covered. */
export const sponsorsPayloadSchema = z.object({
  sponsors: z.array(publicSponsorSchema),
  /** The sum of the year's costs, in cents. */
  costsTotalCents: z.number().int(),
  /**
   * What came in over the last 365 days, in cents.
   *
   * Every payment counts, whatever route it took and whether or not it earned a
   * sponsorship, because the costs are carried by the money rather than by the
   * mention. The window is the one a sponsorship runs for, so this figure and
   * the list of sponsors beside it describe the same period.
   */
  coveredCents: z.number().int(),
  /** What came in over the last 30 days, in cents. */
  donatedMonthCents: z.number().int(),
  minAmountCents: z.number().int(),
  /**
   * What one automated shop check costs on average, in cents.
   *
   * Travels with the running costs because it is one of them, and the support
   * page names both in the same sentence. Zero whilst no check has been billed
   * yet, which the renderer tells apart from a check that is free.
   */
  reviewCostAvgCents: z.number().int(),
});

/**
 * The account a transfer goes to.
 *
 * Kept apart from the sponsors payload and served only to this project's own
 * renderer. The support page shows these details, because somebody standing
 * there is about to transfer money. The answer to "who is carrying the costs
 * this year" is fetched wherever the sponsor wall appears, and the account
 * details have no business travelling with it.
 */
export const payeeSchema = z.object({
  payeeName: z.string(),
  payeeIban: z.string(),
  payeeBic: z.string(),
  purposeDonation: z.string(),
  purposeSponsor: z.string(),
  purposePaypal: z.string(),
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
/** The account a transfer goes to. */
export type Payee = z.infer<typeof payeeSchema>;

/** The configuration in force when nothing has been set. */
export const SPONSORING_DEFAULTS: SponsoringConfig = sponsoringConfigSchema.parse({});
