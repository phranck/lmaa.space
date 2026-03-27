import { and, eq, lte } from "drizzle-orm";

import { db } from "../db/index.js";
import { adminUsers, shopReminders, shops } from "../db/schema.js";
import type { ShopReminderRow } from "../db/schema.js";

export interface DueReminder {
  id: number;
  shopId: number;
  shopName: string;
  adminEmail: string;
  remindAt: Date;
  note: string | null;
  recurrence: ShopReminderRow["recurrence"];
  recurrenceCustomDays: number | null;
  recurrenceUnit: string | null;
  recurrenceDaysOfWeek: string | null;
}

/**
 * Inserts or replaces the active reminder for a shop.
 * Uses UNIQUE constraint on shopId as conflict target.
 */
export async function upsertReminder(
  shopId: number,
  adminId: number,
  remindAt: Date,
  note: string | null,
  isActive: boolean,
  recurrence: ShopReminderRow["recurrence"],
  recurrenceCustomDays: number | null,
  recurrenceUnit: string | null,
  recurrenceDaysOfWeek: string | null,
): Promise<void> {
  await db
    .insert(shopReminders)
    .values({
      shopId,
      adminId,
      remindAt,
      note,
      isActive,
      recurrence,
      recurrenceCustomDays,
      recurrenceUnit: (recurrenceUnit as "days" | "weeks" | "months" | "years" | null) ?? "days",
      recurrenceDaysOfWeek,
    })
    .onConflictDoUpdate({
      target: shopReminders.shopId,
      set: {
        adminId,
        remindAt,
        note,
        isActive,
        recurrence,
        recurrenceCustomDays,
        recurrenceUnit: (recurrenceUnit as "days" | "weeks" | "months" | "years" | null) ?? "days",
        recurrenceDaysOfWeek,
        createdAt: new Date(),
      },
    });
}

/**
 * Loads the active reminder for a specific shop, filtered to the given admin.
 * Returns `null` when none exists.
 */
export async function getReminder(
  shopId: number,
  adminId: number,
): Promise<ShopReminderRow | null> {
  const [row] = await db
    .select()
    .from(shopReminders)
    .where(and(eq(shopReminders.shopId, shopId), eq(shopReminders.adminId, adminId)))
    .limit(1);
  return row ?? null;
}

/**
 * Returns all active reminders whose due time has passed,
 * joined with shop name and admin email.
 */
export async function getDueReminders(): Promise<DueReminder[]> {
  const now = new Date();
  return db
    .select({
      id: shopReminders.id,
      shopId: shopReminders.shopId,
      shopName: shops.name,
      adminEmail: adminUsers.email,
      remindAt: shopReminders.remindAt,
      note: shopReminders.note,
      recurrence: shopReminders.recurrence,
      recurrenceCustomDays: shopReminders.recurrenceCustomDays,
      recurrenceUnit: shopReminders.recurrenceUnit,
      recurrenceDaysOfWeek: shopReminders.recurrenceDaysOfWeek,
    })
    .from(shopReminders)
    .innerJoin(shops, eq(shopReminders.shopId, shops.id))
    .innerJoin(adminUsers, eq(shopReminders.adminId, adminUsers.id))
    .where(and(eq(shopReminders.isActive, true), lte(shopReminders.remindAt, now)));
}

/**
 * Advances a recurring reminder's due date to its next occurrence.
 */
export async function advanceReminderDate(id: number, nextRemindAt: Date): Promise<void> {
  await db.update(shopReminders).set({ remindAt: nextRemindAt }).where(eq(shopReminders.id, id));
}

/**
 * Deletes a reminder by its primary key.
 */
export async function deleteReminderById(id: number): Promise<void> {
  await db.delete(shopReminders).where(eq(shopReminders.id, id));
}
