import { z } from "zod";

/**
 * What somebody says about themselves before they pay.
 *
 * A SEPA transfer carries either a sentence or a reference, and everything
 * below is more than a sentence could hold and less certain to survive one: the
 * payer's app may let them edit the text, and a bank may replace a character it
 * does not carry. So this is said here, on the site, and the payment carries
 * only a reference pointing back at it.
 */

/** How many characters of claim the public form accepts. */
export const MAX_PENDING_CLAIM = 250;

/** How long an unclaimed entry stands before it is removed, in days. */
export const PENDING_SPONSORSHIP_DAYS = 60;

/** Everything the form asks of somebody who means to become a sponsor. */
export const pendingSponsorshipInputSchema = z
  .object({
    /** The given name, which is the one the site would lead with. */
    firstName: z.string().trim().min(1).max(80),
    /** The family name, empty for anybody who wants one name only. */
    lastName: z.string().trim().max(80).default(""),
    /**
     * Where they can be found, as one address of any kind.
     *
     * One field rather than one per service, because somebody giving their
     * address should not first have to say what kind it is. Which service it
     * belongs to is worked out from the address itself, and an address on none
     * of the known ones is a website.
     */
    link: z.string().trim().max(200).default(""),
    /** Their own sentence, shorter here than in the dashboard. */
    claim: z.string().trim().max(MAX_PENDING_CLAIM).default(""),
    /**
     * Whether they want to be named on the site.
     *
     * Asked here rather than carried in the payment, because a flag a bank may
     * fold and a payer may delete is not a record of consent.
     */
    published: z.boolean(),
  })
  .strict();

/** A pending sponsorship as the site reads it back. */
export const pendingSponsorshipSchema = pendingSponsorshipInputSchema.omit({ link: true }).extend({
  id: z.string(),
  /** The reference the transfer carries, in the form it travels. */
  reference: z.string(),
  /**
   * The address, sorted into the service it belongs to.
   *
   * Stored as the map a sponsor already carries, so what the form takes in one
   * field arrives where the rest of the site expects to read it.
   */
  socialMedia: z.record(z.string(), z.string()),
  /** When they said it, which is what makes the consent a record. */
  createdAt: z.string(),
});

/** What the site answers once the form has been taken. */
export const pendingSponsorshipReceiptSchema = z.object({
  /** The reference as it travels, without spaces. */
  reference: z.string(),
  /** The same reference in groups of four, which is how it is printed. */
  referenceFormatted: z.string(),
});

/** Everything the form asks of somebody who means to become a sponsor. */
export type PendingSponsorshipInput = z.infer<typeof pendingSponsorshipInputSchema>;
/** A pending sponsorship as the site reads it back. */
export type PendingSponsorship = z.infer<typeof pendingSponsorshipSchema>;
/** What the site answers once the form has been taken. */
export type PendingSponsorshipReceipt = z.infer<typeof pendingSponsorshipReceiptSchema>;
