import { desc, eq, isNull, lt } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  type BankAuthorizationStateRow,
  type BankConnectionInsert,
  type BankConnectionRow,
  bankAuthorizationStates,
  bankConnections,
} from "../db/schema.js";
import { matchAuthorizationState } from "../lib/bank-authorization-state.js";

/**
 * Records an authorisation this site has just started.
 *
 * @param state - The value the bank will hand back, as hex.
 * @param authorizationId - What Enable Banking called the authorisation.
 * @param expiresAt - The moment after which a return no longer counts.
 * @returns The row as the database holds it, read back rather than assumed.
 *
 * @remarks
 * Whatever has expired goes first. An authorisation nobody completed leaves its
 * row behind, and this is the one place that is guaranteed to run again, so it
 * is where the table is swept rather than in a job of its own.
 */
export async function insertAuthorizationState(
  state: string,
  authorizationId: string,
  expiresAt: Date,
  now: Date,
): Promise<BankAuthorizationStateRow> {
  return db.transaction(async (tx) => {
    await tx.delete(bankAuthorizationStates).where(lt(bankAuthorizationStates.expiresAt, now));

    const [created] = await tx
      .insert(bankAuthorizationStates)
      .values({ state, authorizationId, expiresAt })
      .returning();
    return created;
  });
}

/**
 * Recognises a returning authorisation and spends it.
 *
 * @param presented - The value the bank handed back through the dashboard.
 * @param now - The moment to judge expiry against.
 * @returns The row that matched, or `null` when none did.
 *
 * @remarks
 * Every row is loaded and the match is made in `matchAuthorizationState`, which
 * decides both the comparison and the expiry. The query does not filter by
 * expiry, because two places deciding when an authorisation has run out is two
 * answers to one question. The table holds an authorisation only whilst one is
 * in flight, so loading all of them is cheap.
 *
 * The matched row is deleted in the same transaction that found it, and the
 * delete is what decides the answer. A second return carrying the same value
 * therefore finds nothing, including when both arrive at once.
 */
export async function takeAuthorizationState(
  presented: string,
  now: Date,
): Promise<BankAuthorizationStateRow | null> {
  return db.transaction(async (tx) => {
    const stored = await tx.select().from(bankAuthorizationStates);

    const matched = matchAuthorizationState(stored, presented, now);
    if (!matched) return null;

    const removed = await tx
      .delete(bankAuthorizationStates)
      .where(eq(bankAuthorizationStates.state, matched.state))
      .returning({ state: bankAuthorizationStates.state });

    return removed.length > 0 ? matched : null;
  });
}

/**
 * The connection in force, or `null` when the site has none.
 *
 * @returns The live row, or `null` where every connection has been revoked.
 */
export async function getLiveBankConnection(): Promise<BankConnectionRow | null> {
  const [row] = await db
    .select()
    .from(bankConnections)
    .where(isNull(bankConnections.revokedAt))
    .orderBy(desc(bankConnections.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * Puts a new connection in force and retires whatever was in force before.
 *
 * @param data - The session, the account and the institution behind it.
 * @param now - The moment the previous connection stopped being current.
 * @returns The stored row.
 *
 * @remarks
 * Both writes are one transaction, because the database allows a single live
 * row and the insert would otherwise be refused whilst the old one still counts
 * as live. The old row is marked revoked rather than deleted, so it stays
 * answerable since when which connection was in force.
 */
export async function replaceBankConnection(
  data: BankConnectionInsert,
  now: Date,
): Promise<BankConnectionRow> {
  return db.transaction(async (tx) => {
    await tx
      .update(bankConnections)
      .set({ revokedAt: now })
      .where(isNull(bankConnections.revokedAt));

    const [created] = await tx.insert(bankConnections).values(data).returning();
    return created;
  });
}
