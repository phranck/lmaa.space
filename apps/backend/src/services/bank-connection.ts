import { randomBytes } from "node:crypto";

import type { BankAuthorizationStart, BankConnectionStatus } from "@lmaa/contracts";

import {
  createSession,
  isEnableBankingConfigured,
  startAuthorization,
} from "./enable-banking-client.js";
import { env } from "../config/env.js";
import type { BankConnectionRow } from "../db/schema.js";
import { HttpError } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import {
  getLiveBankConnection,
  insertAuthorizationState,
  replaceBankConnection,
  takeAuthorizationState,
} from "../repositories/bank-connections.js";

/**
 * How many random bytes the value carried through the return is made of.
 *
 * Thirty-two bytes is 256 bits, written as 64 hexadecimal characters. The value
 * has to survive guessing rather than collision: an attacker who could present
 * a value this site issued would have a code of their own exchanged against
 * this account. At 256 bits that is not a thing to plan for, and a collision
 * between two of them even less so, but the row is still read back after it is
 * written rather than assumed.
 */
const AUTHORIZATION_STATE_BYTES = 32;

/** How long a started authorisation has to come back before it stops counting. */
const AUTHORIZATION_STATE_LIFETIME_MS = 15 * 60 * 1000;

/**
 * How long the consent is asked to last.
 *
 * What the bank grants is its own decision and comes back in the answer, which
 * is what gets stored. This is the request.
 */
const CONSENT_REQUESTED_DAYS = 180;

/** Milliseconds in a day, for reading the consent length above. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where the bank returns the person.
 *
 * A dashboard route, because the return has to reach a page that is already
 * signed in. The address is built from `DASHBOARD_URL` rather than from
 * anything in the request, and the same address is registered with the provider,
 * which refuses any other.
 */
const CALLBACK_PATH = "/bank-connection/callback";

/**
 * How many accounts a usable session reaches.
 *
 * Exactly the one account the application is linked to. The provider enforces
 * this from its side by answering with an empty list for anything else, and
 * this side refuses a session that carries a different number rather than
 * storing one whose reach it has not established.
 */
const EXPECTED_ACCOUNT_COUNT = 1;

/**
 * Turns the stored connection into what the dashboard shows.
 *
 * @param connection - The connection in force, or `null` where there is none.
 * @returns The status, which carries nothing that could reach the account.
 */
function toStatus(connection: BankConnectionRow | null): BankConnectionStatus {
  return {
    configured: isEnableBankingConfigured(),
    connected: connection !== null,
    institutionName: connection?.aspspName ?? "",
    institutionCountry: connection?.aspspCountry ?? "",
    consentValidUntil: connection?.consentValidUntil?.toISOString() ?? null,
    connectedAt: connection?.createdAt.toISOString() ?? null,
  };
}

/**
 * What the dashboard shows about the connection.
 *
 * @returns Whether the site is configured, whether a connection is in force,
 *   and when its consent lapses.
 *
 * @remarks
 * Every field comes from this site's own database. Nothing here is fetched from
 * the provider, so the page answers whilst the bank is unreachable and says
 * what it knows rather than nothing.
 */
export async function getBankConnectionStatus(): Promise<BankConnectionStatus> {
  return toStatus(await getLiveBankConnection());
}

/**
 * Starts an authorisation and says where to send the person.
 *
 * @returns The bank's address, which the dashboard navigates to.
 * @throws {HttpError} 503 when the site holds no credential, 502 when the
 *   provider cannot be reached.
 *
 * @remarks
 * The value that ties the return to this start is written down before the
 * person leaves, so a return can only be honoured against a start this site
 * made.
 */
export async function beginBankAuthorization(): Promise<BankAuthorizationStart> {
  const now = new Date();
  const state = randomBytes(AUTHORIZATION_STATE_BYTES).toString("hex");
  const redirectUrl = new URL(CALLBACK_PATH, env.DASHBOARD_URL).toString();

  const started = await startAuthorization(
    state,
    redirectUrl,
    new Date(now.getTime() + CONSENT_REQUESTED_DAYS * DAY_MS),
  );

  const stored = await insertAuthorizationState(
    state,
    started.authorizationId,
    new Date(now.getTime() + AUTHORIZATION_STATE_LIFETIME_MS),
    now,
  );

  logger.info(
    { authorizationId: stored.authorizationId, expiresAt: stored.expiresAt },
    "bank authorization started",
  );

  return { url: started.url };
}

/**
 * Honours a return from the bank and puts the connection in force.
 *
 * @param code - The code the bank issued, to be exchanged for a session.
 * @param state - The value this site sent out, as it came back.
 * @returns The status the dashboard shows afterwards.
 * @throws {HttpError} 400 when the return matches no start this site made, 502
 *   when the provider fails or answers with a reach that was not asked for.
 *
 * @remarks
 * The value is recognised before the code is spent, so a return nobody started
 * costs one database read and no call to the provider.
 */
export async function completeBankAuthorization(
  code: string,
  state: string,
): Promise<BankConnectionStatus> {
  const now = new Date();

  const started = await takeAuthorizationState(state, now);
  if (!started) {
    logger.warn({}, "bank authorization return matched no start");
    throw new HttpError(400, "This authorisation is no longer open", "bank_state_unknown");
  }

  const session = await createSession(code);
  if (session.accountUids.length !== EXPECTED_ACCOUNT_COUNT) {
    // Not stored, so nothing here can read the account. The session itself
    // stays open at the provider until its consent lapses.
    logger.error(
      { authorizationId: started.authorizationId, accountCount: session.accountUids.length },
      "bank session discarded: unexpected number of accounts",
    );
    throw new HttpError(
      502,
      "The bank connection reached an unexpected set of accounts",
      "bank_unexpected_accounts",
    );
  }

  const connection = await replaceBankConnection(
    {
      sessionId: session.sessionId,
      accountUid: session.accountUids[0],
      aspspName: session.aspspName,
      aspspCountry: session.aspspCountry,
      consentValidUntil: session.consentValidUntil,
    },
    now,
  );

  logger.info(
    {
      authorizationId: started.authorizationId,
      accountCount: session.accountUids.length,
      consentValidUntil: connection.consentValidUntil,
    },
    "bank connection established",
  );

  return toStatus(connection);
}
