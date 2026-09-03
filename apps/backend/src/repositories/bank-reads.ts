import { and, desc, eq, gt, isNotNull, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { type BankAccountReadRow, bankAccountReads } from "../db/schema.js";

/** Which kind of read asked the bank. */
export type BankReadKind = "background" | "manual";

/**
 * Key for the advisory lock that serialises claiming a read.
 *
 * Arbitrary but fixed: a changed key would stop excluding a container still
 * running the previous build. It guards the claim alone, which is a single
 * short transaction, so nothing is held whilst the bank is being talked to.
 */
const BANK_READ_ADVISORY_LOCK_KEY = 46_102_068;

/**
 * Claims one read, or refuses because the budget for the window is spent.
 *
 * @param kind - Which budget to draw on.
 * @param maxReads - How many reads of that kind the window allows.
 * @param windowHours - How long the window is, counted back from now.
 * @returns The claimed row, or `null` when the budget is spent.
 *
 * @remarks
 * Counting and claiming happen inside one transaction behind an advisory lock,
 * so two containers cannot both take the last slot after both counted the same
 * number. The window slides rather than resetting at midnight, which is what
 * Article 36(5) of Commission Delegated Regulation (EU) 2018/389 says: counting
 * per calendar day would permit four at 23:00 and four more at 01:00.
 */
export async function claimBankRead(
  kind: BankReadKind,
  maxReads: number,
  windowHours: number,
): Promise<BankAccountReadRow | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${BANK_READ_ADVISORY_LOCK_KEY})`);

    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const [used] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bankAccountReads)
      .where(and(eq(bankAccountReads.kind, kind), gt(bankAccountReads.readAt, since)));

    if ((used?.count ?? 0) >= maxReads) return null;

    const [claimed] = await tx.insert(bankAccountReads).values({ kind }).returning();
    return claimed;
  });
}

/**
 * The last day any finished run covered.
 *
 * @returns The day as `YYYY-MM-DD`, or `null` when nothing has finished yet.
 *
 * @remarks
 * Only successful runs count. One that broke off says nothing about what has
 * been seen, and treating it as a cursor would step over the days it never
 * reached.
 */
export async function getLastBookedThrough(): Promise<string | null> {
  const [row] = await db
    .select({ bookedThrough: bankAccountReads.bookedThrough })
    .from(bankAccountReads)
    .where(and(eq(bankAccountReads.succeeded, true), isNotNull(bankAccountReads.bookedThrough)))
    .orderBy(desc(bankAccountReads.bookedThrough))
    .limit(1);
  return row?.bookedThrough ?? null;
}

/** What a finished run reports about itself. */
export interface BankReadOutcome {
  /** The last day it covered, which the next run starts after. */
  bookedThrough: string;
  /** How many entries came back, before anything was decided about them. */
  transactionsRead: number;
  /** How many became a row in the ledger. */
  imported: number;
  /** How many were recognised and already stood there. */
  skipped: number;
}

/**
 * Records that a claimed read finished, and what it found.
 *
 * @param id - The row `claimBankRead` handed back.
 * @param outcome - The counts and the day reached.
 */
export async function completeBankRead(id: string, outcome: BankReadOutcome): Promise<void> {
  await db
    .update(bankAccountReads)
    .set({ succeeded: true, ...outcome })
    .where(eq(bankAccountReads.id, id));
}

/**
 * The most recent read, whatever became of it.
 *
 * @returns The row, or `null` before the first read.
 */
export async function getLastBankRead(): Promise<BankAccountReadRow | null> {
  const [row] = await db
    .select()
    .from(bankAccountReads)
    .orderBy(desc(bankAccountReads.readAt))
    .limit(1);
  return row ?? null;
}
