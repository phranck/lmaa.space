import { z } from "zod";

/**
 * The link between the site and the bank account it reads.
 *
 * Only the owner ever sees any of this. The public side of the donation
 * counter reads figures from the ledger and knows nothing about how they got
 * there.
 */

/** How many characters the value carried through the return has. */
export const BANK_AUTHORIZATION_STATE_LENGTH = 64;

/**
 * What the bank hands back through the dashboard.
 *
 * Both values arrive in the address bar of a dashboard page and are posted
 * straight on to the backend, which is the only place that can spend them.
 */
export const bankConnectionCallbackSchema = z
  .object({
    /**
     * The code the bank issued, to be exchanged for a session.
     *
     * Bounded by an alphabet and a length rather than by a shape: the provider
     * documents that a `code` comes back and not what it looks like, so
     * anything stricter would be a guess that refuses valid returns.
     */
    code: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^[A-Za-z0-9._~-]+$/, "Expected an authorization code"),
    /** The value this site sent out, which says the return belongs to it. */
    state: z
      .string()
      .trim()
      .length(BANK_AUTHORIZATION_STATE_LENGTH)
      .regex(/^[0-9a-f]+$/, "Expected the state this site issued"),
  })
  .strict();

/** What the dashboard shows about the connection. */
export const bankConnectionStatusSchema = z.object({
  /** Whether the site holds the credential that reaches the provider at all. */
  configured: z.boolean(),
  /** Whether a connection is in force. */
  connected: z.boolean(),
  /** The institution as the provider names it, empty whilst unconnected. */
  institutionName: z.string(),
  /** Its country, in two letters, empty whilst unconnected. */
  institutionCountry: z.string(),
  /** When the consent lapses, or `null` where none was stated. */
  consentValidUntil: z.string().nullable(),
  /** When the connection in force was made, or `null` where there is none. */
  connectedAt: z.string().nullable(),

  /** When the account was last read, or `null` before the first time. */
  lastReadAt: z.string().nullable(),
  /** Whether that read finished. `null` where there has been none. */
  lastReadSucceeded: z.boolean().nullable(),
  /** How many payments that read took into the ledger. */
  lastReadImported: z.number().int(),
  /**
   * Why the last read failed, as the bank client's own error code.
   *
   * `null` where it succeeded and before the first read. A code rather than a
   * sentence, so the wording belongs to whoever shows it and the same failure
   * reads the same in every language.
   */
  lastReadFailure: z.string().nullable(),
});

/** Where to send the browser so the person can identify themselves. */
export const bankAuthorizationStartSchema = z.object({
  /** The bank's own address, which the dashboard navigates to. */
  url: z.string().url(),
});

/** What the bank hands back through the dashboard. */
export type BankConnectionCallback = z.infer<typeof bankConnectionCallbackSchema>;
/** What the dashboard shows about the connection. */
export type BankConnectionStatus = z.infer<typeof bankConnectionStatusSchema>;
/** Where to send the browser so the person can identify themselves. */
export type BankAuthorizationStart = z.infer<typeof bankAuthorizationStartSchema>;
