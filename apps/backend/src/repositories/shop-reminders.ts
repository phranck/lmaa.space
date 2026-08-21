import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { db } from "../db/client.js";
import { adminUsers, emailTemplates, shopReminders, shops } from "../db/schema.js";
import type { EmailTemplate, ShopReminderRow } from "../db/schema.js";

export interface DueReminder {
  id: number;
  shopId: number;
  shopName: string;
  adminId: number;
  adminEmail: string;
  remindAt: Date;
  note: string | null;
  recurrence: ShopReminderRow["recurrence"];
  recurrenceCustomDays: number | null;
  recurrenceUnit: string | null;
  recurrenceDaysOfWeek: string | null;
  sendEmail: boolean;
  emailTemplate: EmailTemplate | null;
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
  sendEmail: boolean,
  emailTemplateId: number | null,
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
      sendEmail,
      emailTemplateId,
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
        sendEmail,
        emailTemplateId,
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
 * Claims every due reminder for this caller and returns what it won.
 *
 * @param leaseMs - How long the claim holds before another caller may take the
 *   reminder over. It has to outlast a send, because an expiring lease is what
 *   turns a failed send back into a retry.
 * @returns The claimed reminders, joined with shop name, admin email, and the
 *   optional email template. Empty when another caller holds every due one.
 *
 * @remarks
 * Side effects: writes `claimed_until` on every row it claims.
 *
 * The backend runs with several containers and each ticks its own scheduler, so
 * an unprotected read would let all of them send the same reminder.
 */
export async function claimDueReminders(leaseMs: number): Promise<DueReminder[]> {
  const now = new Date();

  // One statement decides who sends. Postgres re-evaluates the WHERE clause
  // after waiting for a concurrent update of the same row, so a second
  // container finds `claimed_until` in the future and claims nothing.
  const claimed = await db
    .update(shopReminders)
    .set({ claimedUntil: new Date(now.getTime() + leaseMs) })
    .where(
      and(
        eq(shopReminders.isActive, true),
        lte(shopReminders.remindAt, now),
        or(isNull(shopReminders.claimedUntil), lte(shopReminders.claimedUntil, now)),
      ),
    )
    .returning({ id: shopReminders.id });

  if (claimed.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: shopReminders.id,
      shopId: shopReminders.shopId,
      shopName: shops.name,
      adminId: shopReminders.adminId,
      adminEmail: adminUsers.email,
      remindAt: shopReminders.remindAt,
      note: shopReminders.note,
      recurrence: shopReminders.recurrence,
      recurrenceCustomDays: shopReminders.recurrenceCustomDays,
      recurrenceUnit: shopReminders.recurrenceUnit,
      recurrenceDaysOfWeek: shopReminders.recurrenceDaysOfWeek,
      sendEmail: shopReminders.sendEmail,
      emailTemplateId: shopReminders.emailTemplateId,
      emailTemplateName: emailTemplates.name,
      emailTemplateSubject: emailTemplates.subject,
      emailTemplateHeaderBannerUrl: emailTemplates.headerBannerUrl,
      emailTemplateHeaderText: emailTemplates.headerText,
      emailTemplateBodyText: emailTemplates.bodyText,
      emailTemplateFooterBannerUrl: emailTemplates.footerBannerUrl,
      emailTemplateFooterText: emailTemplates.footerText,
      emailTemplateIsSystemTemplate: emailTemplates.isSystemTemplate,
      emailTemplateCreatedAt: emailTemplates.createdAt,
      emailTemplateUpdatedAt: emailTemplates.updatedAt,
    })
    .from(shopReminders)
    .innerJoin(shops, eq(shopReminders.shopId, shops.id))
    .innerJoin(adminUsers, eq(shopReminders.adminId, adminUsers.id))
    .leftJoin(emailTemplates, eq(shopReminders.emailTemplateId, emailTemplates.id))
    .where(
      inArray(
        shopReminders.id,
        claimed.map((row) => row.id),
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    shopId: row.shopId,
    shopName: row.shopName,
    adminId: row.adminId,
    adminEmail: row.adminEmail,
    remindAt: row.remindAt,
    note: row.note,
    recurrence: row.recurrence,
    recurrenceCustomDays: row.recurrenceCustomDays,
    recurrenceUnit: row.recurrenceUnit,
    recurrenceDaysOfWeek: row.recurrenceDaysOfWeek,
    sendEmail: row.sendEmail,
    emailTemplate:
      row.emailTemplateId != null
        ? {
            id: row.emailTemplateId,
            name: row.emailTemplateName!,
            subject: row.emailTemplateSubject!,
            headerBannerUrl: row.emailTemplateHeaderBannerUrl ?? null,
            headerText: row.emailTemplateHeaderText ?? null,
            bodyText: row.emailTemplateBodyText!,
            footerBannerUrl: row.emailTemplateFooterBannerUrl ?? null,
            footerText: row.emailTemplateFooterText ?? null,
            isSystemTemplate: row.emailTemplateIsSystemTemplate!,
            createdAt: row.emailTemplateCreatedAt!,
            updatedAt: row.emailTemplateUpdatedAt!,
          }
        : null,
  }));
}

/**
 * Advances a recurring reminder's due date to its next occurrence.
 *
 * @param id - Reminder id.
 * @param nextRemindAt - When the reminder falls due again.
 *
 * @remarks
 * Releases the claim in the same statement, because the reminder has been sent
 * and the next occurrence has to be claimable again.
 */
export async function advanceReminderDate(id: number, nextRemindAt: Date): Promise<void> {
  await db
    .update(shopReminders)
    .set({ remindAt: nextRemindAt, claimedUntil: null })
    .where(eq(shopReminders.id, id));
}

/**
 * Deletes a reminder by its primary key.
 */
export async function deleteReminderById(id: number): Promise<void> {
  await db.delete(shopReminders).where(eq(shopReminders.id, id));
}
