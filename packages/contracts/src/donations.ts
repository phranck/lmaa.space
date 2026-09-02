import { z } from "zod";

import { socialMediaLinksSchema, socialMediaSchema } from "@lmaa/shared";

/**
 * Every payment that arrives, whatever route it took.
 *
 * The running costs are carried by the money rather than by the sponsorships,
 * so a figure saying what is left to fund the year has to count all of it. One
 * ledger answers that in one sum, which is what keeps a payment from being
 * counted twice or not at all.
 */

/**
 * Where a payment came in, against the name shown for it.
 *
 * The label travels with the key so the dashboard's select and the stored value
 * cannot drift apart. GitHub Sponsors stands on its own although the money
 * lands in the same PayPal account, because otherwise nobody can ask later what
 * arrived through GitHub. Services no longer in use stay listed, so a payment
 * from the time they were can still be filed where it belongs.
 */
export const DONATION_PROVIDERS = {
  sepa: "Überweisung",
  paypal: "PayPal",
  ghsponsors: "GitHub Sponsors",
  kofi: "Ko-fi",
  liberapay: "Liberapay",
  patreon: "Patreon",
  stripe: "Stripe",
  buymeacoffee: "Buy Me a Coffee",
  cash: "Bar",
  other: "Sonstiges",
} as const satisfies Record<string, string>;

/** Name of one route a payment took. */
export type DonationProvider = keyof typeof DONATION_PROVIDERS;

/** Every route, in declaration order, which is also the order the select shows. */
export const DONATION_PROVIDER_KEYS = Object.keys(DONATION_PROVIDERS) as [
  DonationProvider,
  ...DonationProvider[],
];

/** Everything an editor records about one payment. */
export const donationInputSchema = z.object({
  /**
   * The given name, split as a sponsor's is so both render alike.
   *
   * May be empty, and is for every payment the site read from the bank: the
   * payer's name stands in the statement and is a third party's data nobody
   * gave for this, so it is not taken. A payment entered by hand may be nameless
   * too, because sometimes nobody knows who paid, and refusing to record it
   * would lose the money from the ledger rather than the name.
   */
  firstName: z.string().trim().max(80).default(""),
  /** The family name, empty for anybody given under one name only. */
  lastName: z.string().trim().max(80).default(""),
  /**
   * Where they can be found, as a platform key against a profile address.
   *
   * Optional and usually absent: a bank transfer carries no such address, and
   * asking for one is only possible where the payment came with a message.
   */
  socialMedia: socialMediaSchema,
  /**
   * Whether they agreed to be named.
   *
   * False by default, and read by nothing today. Somebody who transfers money
   * has consented to nothing, so the flag records an answer that was actually
   * given rather than one assumed from silence. It is set at the moment the
   * payment is entered because it cannot be reconstructed afterwards.
   */
  published: z.boolean().default(false),
  /** What arrived, in cents. Never served on a public route. */
  amountCents: z.coerce.number().int().min(0).max(1_000_000),
  /** The day it arrived, which decides the periods it falls into. */
  receivedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD"),
  /** Which route it took. */
  provider: z.enum(DONATION_PROVIDER_KEYS),
  /** Anything worth keeping about this one payment, such as a reference. */
  note: z.string().trim().max(600).default(""),
  /**
   * The sponsorship this payment paid for, or null for an ordinary donation.
   *
   * The reference points from the payment to the person rather than the other
   * way round, because a sponsorship is renewed by paying again and one sponsor
   * therefore accumulates several payments over the years.
   */
  sponsorId: z.string().uuid().nullable().default(null),
});

/**
 * How a payment got into the ledger.
 *
 * Not the route the money took, which `provider` already says. A transfer can
 * have been typed in by hand long after it arrived, so the two answer different
 * questions and a reader of the ledger wants both.
 */
export const DONATION_ORIGINS = ["manual", "bank"] as const;

/** Where a row in the ledger came from. */
export type DonationOrigin = (typeof DONATION_ORIGINS)[number];

/** A payment as stored and read back. */
export const donationSchema = donationInputSchema.extend({
  id: z.string().min(1).max(64),
  /** Always a list when read back, empty where nothing was entered. */
  socialMedia: socialMediaLinksSchema,
  /**
   * Whether a person entered this payment or the site read it from the bank.
   *
   * Derived from whether the row carries what the bank called the entry, so
   * there is one fact behind it rather than a flag that could disagree with it.
   * The identifier itself is not served: it says nothing a reader needs and
   * belongs to the account rather than to the ledger.
   */
  origin: z.enum(DONATION_ORIGINS),
  createdAt: z.string(),
});

/**
 * The window a sum is asked for, as a pair of days.
 *
 * Both ends are inclusive, matching how a person reads a date range on a
 * statement. An absent end means everything up to and including today.
 */
export const donationRangeSchema = z.object({
  from: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD")
    .optional(),
});

/**
 * What the ledger's own list takes, being the window and an origin.
 *
 * Its own schema rather than a field on the window, because the sums beside the
 * list are asked for with the window alone. A total that quietly followed the
 * filter would answer a different question from the one its label asks.
 */
export const donationListQuerySchema = donationRangeSchema.extend({
  origin: z.enum(DONATION_ORIGINS).optional(),
});

/**
 * What came in over the periods the dashboard shows at a glance.
 *
 * Every window rolls back from today rather than following the calendar, which
 * is what the sponsor year does as well. One idea of a period across the whole
 * set, so a sentence quoting the month beside the year is not quoting two
 * different things.
 */
export const donationTotalsSchema = z.object({
  /** What came in over the last 30 days, in cents. */
  monthCents: z.number().int(),
  /** What came in over the sponsor year, in cents. */
  yearCents: z.number().int(),
  /** How many payments fall into that year. */
  yearCount: z.number().int(),
});

/**
 * How wide one bar stands, as a period of the ledger.
 *
 * Two sizes and no week between them. A day and a month are both a prefix of
 * the stored `YYYY-MM-DD`, so the database and the caller cut a period at the
 * same place without either of them holding an idea of a calendar. A week has
 * no such prefix, and the two sides would then have to agree separately on
 * which day one starts.
 */
export const DONATION_BUCKETS = ["day", "month"] as const;

/** How wide one bar stands. */
export type DonationBucket = (typeof DONATION_BUCKETS)[number];

/**
 * How many days a window may cover before its bars are drawn per month.
 *
 * A quarter of daily bars is still a chart somebody can read. A year of them is
 * 365 bars in the width of a card, which is a texture rather than a figure.
 */
export const DONATION_DAILY_LIMIT_DAYS = 92;

/**
 * Picks the period size a window of this length is drawn in.
 *
 * The server works this out rather than taking it from the caller. A requested
 * period size would let one request ask for daily bars across a decade, and the
 * length of the answer is then chosen by whoever sent the request. Deriving it
 * from the window bounds the answer at `DONATION_DAILY_LIMIT_DAYS` entries.
 *
 * A window with an open end gives months for the same reason: how far it
 * reaches is not known until the ledger has been read.
 *
 * @param from - The first day of the window, as `YYYY-MM-DD`, or nothing.
 * @param to - The last day of the window, as `YYYY-MM-DD`, or nothing. Both
 *   ends count.
 * @returns Days whilst a closed window fits inside `DONATION_DAILY_LIMIT_DAYS`,
 *   months in every other case.
 */
export function donationBucketFor(from?: string, to?: string): DonationBucket {
  if (!from || !to) return "month";
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return "month";
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return days >= 1 && days <= DONATION_DAILY_LIMIT_DAYS ? "day" : "month";
}

/**
 * What came in over one period of the window.
 *
 * The two amounts are separate rather than one total and a share, because a
 * stacked bar draws them as two heights and a share would have to be turned
 * back into one.
 */
export const donationPeriodSchema = z.object({
  /** The first day of the period, as `YYYY-MM-DD`. */
  start: z.string(),
  /** What came in through sponsorships over it, in cents. */
  sponsorCents: z.number().int(),
  /** What came in without paying for a sponsorship, in cents. */
  donationCents: z.number().int(),
  /** How many payments the two amounts are made of. */
  count: z.number().int(),
});

/** What came in through one payment route over the whole window. */
export const donationProviderTotalSchema = z.object({
  /** Which route, as a key of `DONATION_PROVIDERS`. */
  provider: z.enum(DONATION_PROVIDER_KEYS),
  /** What arrived through it, in cents. */
  cents: z.number().int(),
  /** How many payments took it. */
  count: z.number().int(),
});

/**
 * The ledger grouped, which is what a chart draws.
 *
 * Every period inside the window is present, including the ones nothing came in
 * over. A month with nothing in it is a fact about the year, and a chart that
 * leaves it out draws a line between two bars that are not neighbours.
 *
 * The window's own totals travel with it rather than being added up from the
 * periods, so a figure printed above the chart cannot disagree with the bars
 * beneath it.
 */
export const donationBreakdownSchema = z.object({
  /** How wide the periods are, echoed back as it was applied. */
  bucket: z.enum(DONATION_BUCKETS),
  /** One entry per period, oldest first, gaps included as zero. */
  periods: z.array(donationPeriodSchema),
  /** One entry per route that carried money, largest first. */
  providers: z.array(donationProviderTotalSchema),
  /** What the whole window adds up to, in cents. */
  totalCents: z.number().int(),
  /** How many payments the window holds. */
  totalCount: z.number().int(),
  /** How much of the total paid for a sponsorship, in cents. */
  sponsorCents: z.number().int(),
});

/** Everything an editor records about one payment. */
export type DonationInput = z.infer<typeof donationInputSchema>;
/** A payment as stored and read back. */
export type Donation = z.infer<typeof donationSchema>;
/** The window a sum is asked for. */
export type DonationRange = z.infer<typeof donationRangeSchema>;
/** The window and an origin, which is what the ledger's list takes. */
export type DonationListQuery = z.infer<typeof donationListQuerySchema>;
/** What came in over the periods the dashboard shows. */
export type DonationTotals = z.infer<typeof donationTotalsSchema>;
/** What came in over one period of the window. */
export type DonationPeriod = z.infer<typeof donationPeriodSchema>;
/** What came in through one payment route. */
export type DonationProviderTotal = z.infer<typeof donationProviderTotalSchema>;
/** The ledger grouped, which is what a chart draws. */
export type DonationBreakdown = z.infer<typeof donationBreakdownSchema>;
