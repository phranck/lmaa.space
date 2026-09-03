import { createSign } from "node:crypto";

import { z } from "zod";

import { env } from "../config/env.js";
import { HttpError } from "../lib/http.js";
import { logger } from "../lib/logger.js";

/** The one host this backend ever speaks to about the bank account. */
const ENABLE_BANKING_HOST = "api.enablebanking.com";

/** Everything below is a path against this. */
const ENABLE_BANKING_BASE_URL = `https://${ENABLE_BANKING_HOST}`;

/** Who the request token says it comes from, per the provider's JWT contract. */
const JWT_ISSUER = "enablebanking.com";

/**
 * How long a request token stays valid.
 *
 * The contract allows up to 86400 seconds. A token is signed for one request
 * and used immediately, so it is given the minutes that covers a slow response
 * and nothing beyond them.
 */
const JWT_LIFETIME_SECONDS = 300;

/** How long to wait for the provider before giving up on a request. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * The institution the account sits with, as Enable Banking names it.
 *
 * The account is at Sparkasse Bregenz, and the provider covers it under the
 * Erste Bank entry for Austria, because the Austrian savings banks share that
 * integration. The register of the OeNB puts sort code 20601 with Sparkasse
 * Bregenz whilst Erste Bank itself carries 20111, so the two are separate
 * institutions reached through one entry.
 */
const ASPSP = { name: "Erste Bank", country: "AT" } as const;

/** Which kind of account holder is authorising, per the provider's vocabulary. */
const PSU_TYPE = "personal";

/** What the provider answers when an authorisation is started. */
const authorizationResponseSchema = z.object({
  /**
   * Where the person is sent to identify themselves at their bank.
   *
   * Checked as an address here because it is a destination that arrives in a
   * third party's answer, and the dashboard sends the browser to it. Which host
   * it names is the bank's business and changes with the institution, so what
   * is fixed is the scheme.
   */
  url: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === "https:", "Expected an https address"),
  authorization_id: z.string().max(200).optional(),
});

/** What the provider answers when a returning code is exchanged. */
const sessionResponseSchema = z.object({
  session_id: z.string().min(1).max(200),
  accounts: z.array(z.object({ uid: z.string().min(1).max(200) })).default([]),
  aspsp: z
    .object({
      name: z.string().max(200).optional(),
      country: z.string().max(8).optional(),
    })
    .optional(),
  access: z.object({ valid_until: z.string().max(64).optional() }).optional(),
});

/**
 * What the provider answers when the account's entries are asked for.
 *
 * Every field this site does not read is left out of the schema, so nothing it
 * has no use for is even carried past this point. That matters more than usual
 * here: the account is a private one, and an entry that turns out not to
 * concern this project must leave the reading function without a trace.
 */
const transactionsResponseSchema = z.object({
  transactions: z
    .array(
      z.object({
        /** The bank's own name for the entry, and the only stable one it gives. */
        entry_reference: z.string().min(1).max(200).optional(),
        transaction_amount: z
          .object({
            currency: z.string().max(8),
            /** A decimal as text, which is how the interface states money. */
            amount: z.string().max(32),
          })
          .optional(),
        /** `CRDT` for money arriving, `DBCT` for money leaving. */
        credit_debit_indicator: z.string().max(8).optional(),
        booking_date: z.string().max(32).optional(),
        value_date: z.string().max(32).optional(),
        remittance_information: z.array(z.string().max(500)).max(50).default([]),
      }),
    )
    .default([]),
  continuation_key: z.string().max(2000).nullish(),
});

/** One entry of the account, reduced to what deciding about it needs. */
export interface BankTransaction {
  /** The bank's own name for the entry. */
  entryReference: string;
  /** What moved, in cents, always positive. */
  amountCents: number;
  /** The currency it moved in. */
  currency: string;
  /** Whether the money arrived rather than left. */
  isCredit: boolean;
  /** The day it was booked, as `YYYY-MM-DD`. */
  bookedOn: string;
  /**
   * The remittance text, line by line.
   *
   * Never stored and never logged. It is read to decide whether the entry
   * concerns this project and is dropped with the entry when it does not.
   */
  remittanceLines: string[];
}

/** One page of the account's entries. */
export interface BankTransactionPage {
  transactions: BankTransaction[];
  /** What to ask for to get the next page, or `null` at the end. */
  continuationKey: string | null;
}

/** An authorisation that has been started and is waiting for the person. */
export interface StartedAuthorization {
  /** Where to send the browser. */
  url: string;
  /** What the provider called this authorisation, kept for the log. */
  authorizationId: string;
}

/** A session the provider issued, reduced to what this site stores. */
export interface EnableBankingSession {
  /** The credential every later read of the account presents. */
  sessionId: string;
  /** Every account the session reaches. One of them, or the session is refused. */
  accountUids: string[];
  /** The institution as the provider names it. */
  aspspName: string;
  /** Its country, in the two letters the provider pairs with the name. */
  aspspCountry: string;
  /** When the consent lapses, or `null` where the answer carried no date. */
  consentValidUntil: Date | null;
}

/**
 * Whether the site holds the credential that reaches the provider at all.
 *
 * @returns `true` only when both halves of the credential are configured.
 *
 * @remarks
 * Both or neither: `envSchema` refuses a start where only one is set, so this
 * reads one of them and means both.
 */
export function isEnableBankingConfigured(): boolean {
  return Boolean(env.ENABLE_BANKING_APPLICATION_ID);
}

/**
 * The credential, or a refusal saying the feature is not configured.
 *
 * @returns The application identifier and the private key that signs for it.
 * @throws {HttpError} 503 when the site holds no credential.
 */
function requireCredentials(): { applicationId: string; privateKey: string } {
  const applicationId = env.ENABLE_BANKING_APPLICATION_ID;
  const privateKey = env.ENABLE_BANKING_PRIVATE_KEY;
  if (!applicationId || !privateKey) {
    throw new HttpError(503, "The bank connection is not configured", "bank_not_configured");
  }
  return { applicationId, privateKey };
}

/**
 * Signs one request token for the provider.
 *
 * @returns The compact JWT the `Authorization` header carries.
 *
 * @remarks
 * The token is the credential, so it appears in no log and in no response. It
 * is built by hand rather than through a library because the contract is four
 * claims and a signature, and the key is an ordinary RSA key that `node:crypto`
 * signs with directly.
 */
function signRequestToken(): string {
  const { applicationId, privateKey } = requireCredentials();
  const issuedAt = Math.floor(Date.now() / 1000);

  const header = Buffer.from(
    JSON.stringify({ typ: "JWT", alg: "RS256", kid: applicationId }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: JWT_ISSUER,
      aud: ENABLE_BANKING_HOST,
      iat: issuedAt,
      exp: issuedAt + JWT_LIFETIME_SECONDS,
    }),
  ).toString("base64url");

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();

  return `${header}.${payload}.${signer.sign(privateKey).toString("base64url")}`;
}

/**
 * Sends one request to the provider and returns its parsed answer.
 *
 * @param method - The verb the operation uses.
 * @param path - The path against the provider's base address.
 * @param body - What to send, as JSON, or nothing where the operation has no body.
 * @returns The answer, still unvalidated.
 * @throws {HttpError} 502 when the provider cannot be reached or refuses.
 *
 * @remarks
 * The parsed host is checked against the single host this feature may reach,
 * and redirects are refused outright, so the token cannot be carried to a
 * destination that was not the one checked. Nothing but the token travels: no
 * cookie, no client address, no header the caller sent.
 *
 * What goes to the log is the path and the status. The token, the code and the
 * session are the things this request exists to move, and none of them is
 * loggable.
 */
async function callEnableBanking(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = new URL(path, ENABLE_BANKING_BASE_URL);
  if (url.protocol !== "https:" || url.host !== ENABLE_BANKING_HOST) {
    throw new HttpError(500, "Refused an unexpected destination", "bank_bad_destination");
  }

  // Signed before the request rather than inside it, so a missing or unreadable
  // key is reported as what it is instead of as an unreachable provider.
  const token = signRequestToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    logger.warn(
      { path, cause: cause instanceof Error ? cause.name : "unknown" },
      "bank interface unreachable",
    );
    throw new HttpError(502, "The bank interface could not be reached", "bank_unreachable");
  }

  if (!response.ok) {
    logger.warn({ path, status: response.status }, "bank interface refused the request");
    throw new HttpError(502, "The bank interface refused the request", "bank_request_refused");
  }

  return response.json();
}

/**
 * Parses an answer from the provider, refusing one that does not fit.
 *
 * @param schema - What the answer has to satisfy.
 * @param payload - The answer as it arrived.
 * @param path - The path it answers, for the log.
 * @returns The answer, reduced to the fields this site reads.
 * @throws {HttpError} 502 when the answer does not fit.
 */
function parseAnswer<Schema extends z.ZodTypeAny>(
  schema: Schema,
  payload: unknown,
  path: string,
): z.infer<Schema> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    // The issues name the fields that were wrong and never their values, so
    // nothing from the answer itself reaches the log.
    logger.warn(
      { path, issues: parsed.error.issues.map((issue) => issue.path.join(".")) },
      "bank interface answered in an unexpected shape",
    );
    throw new HttpError(502, "The bank interface answered unexpectedly", "bank_bad_answer");
  }
  return parsed.data;
}

/**
 * Starts an authorisation and returns where to send the person.
 *
 * @param state - The value the return has to carry back, as hex.
 * @param redirectUrl - Where the bank returns the person, from configuration.
 * @param validUntil - How long the consent is asked to last.
 * @returns The address to send the browser to, and the provider's own name for
 *   this authorisation.
 * @throws {HttpError} 503 when unconfigured, 502 when the provider fails.
 */
export async function startAuthorization(
  state: string,
  redirectUrl: string,
  validUntil: Date,
): Promise<StartedAuthorization> {
  const path = "/auth";
  const answer = parseAnswer(
    authorizationResponseSchema,
    await callEnableBanking("POST", path, {
      access: { valid_until: validUntil.toISOString() },
      aspsp: ASPSP,
      state,
      redirect_url: redirectUrl,
      psu_type: PSU_TYPE,
    }),
    path,
  );

  return { url: answer.url, authorizationId: answer.authorization_id ?? "" };
}

/**
 * Exchanges a returning code for a session.
 *
 * @param code - What the bank handed back through the dashboard.
 * @returns The session, the accounts it reaches and when the consent lapses.
 * @throws {HttpError} 503 when unconfigured, 502 when the provider fails.
 *
 * @remarks
 * The exchange happens here rather than in the dashboard, because the key that
 * signs for it is here and nowhere else.
 */
export async function createSession(code: string): Promise<EnableBankingSession> {
  const path = "/sessions";
  const answer = parseAnswer(
    sessionResponseSchema,
    await callEnableBanking("POST", path, { code }),
    path,
  );

  const validUntil = answer.access?.valid_until;
  const consentValidUntil = validUntil ? new Date(validUntil) : null;

  return {
    sessionId: answer.session_id,
    accountUids: answer.accounts.map((account) => account.uid),
    aspspName: answer.aspsp?.name ?? "",
    aspspCountry: answer.aspsp?.country ?? "",
    consentValidUntil:
      consentValidUntil && !Number.isNaN(consentValidUntil.getTime()) ? consentValidUntil : null,
  };
}

/**
 * What an identifier may consist of before it is put into a path.
 *
 * Both the session and the account come from this site's own database and
 * originally from the provider, so neither is caller input. The pattern is here
 * because they are about to become part of a URL, and a value that cannot hold
 * a slash or a dot segment cannot leave the path it was meant for whatever else
 * changes around it.
 */
const PATH_IDENTIFIER_PATTERN = /^[A-Za-z0-9._~-]{1,200}$/;

/** An identifier made only of dots is a path segment rather than a name. */
const DOT_SEGMENT_PATTERN = /^\.+$/;

/**
 * Closes a session at the provider, which ends the consent behind it.
 *
 * @param sessionId - The session as it was stored when it was created.
 * @throws {HttpError} 500 when the identifier is not one this site could have
 *   stored, 503 when unconfigured, 502 when the provider fails.
 *
 * @remarks
 * The provider closes the bank's consent with the session where it can, which
 * is what makes this more than forgetting the identifier locally. A session
 * nobody closes stays open until its consent lapses on its own.
 */
export async function closeSession(sessionId: string): Promise<void> {
  if (!PATH_IDENTIFIER_PATTERN.test(sessionId) || DOT_SEGMENT_PATTERN.test(sessionId)) {
    throw new HttpError(500, "Refused an unexpected destination", "bank_bad_destination");
  }

  await callEnableBanking("DELETE", `/sessions/${encodeURIComponent(sessionId)}`);
}

/** Money arriving, as the interface names the direction. */
const CREDIT_INDICATOR = "CRDT";

/** Only entries the bank has actually booked, never ones still pending. */
const BOOKED_STATUS = "BOOK";

/**
 * Use the dates that were asked for.
 *
 * The alternative, `longest`, looks for the longest period the bank will give,
 * ignores `date_to`, and costs extra calls at the bank to find out. This run
 * knows exactly which days it wants.
 */
const FETCH_STRATEGY = "default";

/**
 * Turns money as the interface states it into cents.
 *
 * @param amount - A decimal as text, such as `12.34`.
 * @returns The amount in cents, always positive, or `null` when it is not a
 *   number. The direction is carried separately, so a sign here would be a
 *   second answer to a question `credit_debit_indicator` already settles.
 */
function toCents(amount: string): number | null {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return Math.abs(Math.round(value * 100));
}

/**
 * Reads one page of the account's entries.
 *
 * @param accountUid - The account, as the session named it.
 * @param range - The days to ask for, both ends counting, as `YYYY-MM-DD`.
 * @param continuationKey - What the previous page answered, or nothing.
 * @returns The entries and the key for the next page, if any.
 * @throws {HttpError} 500 when the account identifier is not one this site
 *   could have stored, 503 when unconfigured, 502 when the provider fails.
 *
 * @remarks
 * Only booked entries are asked for. That leaves the pending ones out, and it
 * stops one payment being counted once as pending and once as booked.
 *
 * The remittance text cannot be filtered on here, because the regulated
 * interface behind the provider has no free-text search. The window and the
 * status are therefore made as narrow as they can be, and what still comes back
 * is decided about by the caller and dropped where it does not concern this
 * project.
 */
export async function fetchTransactions(
  accountUid: string,
  range: { from: string; to: string },
  continuationKey?: string,
): Promise<BankTransactionPage> {
  if (!PATH_IDENTIFIER_PATTERN.test(accountUid) || DOT_SEGMENT_PATTERN.test(accountUid)) {
    throw new HttpError(500, "Refused an unexpected destination", "bank_bad_destination");
  }

  const query = new URLSearchParams({
    date_from: range.from,
    date_to: range.to,
    transaction_status: BOOKED_STATUS,
    strategy: FETCH_STRATEGY,
  });
  if (continuationKey) query.set("continuation_key", continuationKey);

  const path = `/accounts/${encodeURIComponent(accountUid)}/transactions?${query.toString()}`;
  const answer = parseAnswer(
    transactionsResponseSchema,
    await callEnableBanking("GET", path),
    "/accounts/{uid}/transactions",
  );

  const transactions: BankTransaction[] = [];
  for (const entry of answer.transactions) {
    const bookedOn = entry.booking_date ?? entry.value_date;
    const amountCents = entry.transaction_amount ? toCents(entry.transaction_amount.amount) : null;
    // An entry the interface did not date, name or price cannot be reconciled
    // and is not guessed at. It leaves here as though it had not been read.
    if (!entry.entry_reference || !bookedOn || amountCents === null) continue;

    transactions.push({
      entryReference: entry.entry_reference,
      amountCents,
      currency: entry.transaction_amount?.currency ?? "",
      isCredit: entry.credit_debit_indicator === CREDIT_INDICATOR,
      bookedOn: bookedOn.slice(0, 10),
      remittanceLines: entry.remittance_information,
    });
  }

  return { transactions, continuationKey: answer.continuation_key ?? null };
}
