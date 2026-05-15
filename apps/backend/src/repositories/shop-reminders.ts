import { and, eq, lte } from "drizzle-orm";

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
 * Returns all active reminders whose due time has passed,
 * joined with shop name, admin email, and optional email template.
 */
export async function getDueReminders(): Promise<DueReminder[]> {
  const now = new Date();
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
    .where(and(eq(shopReminders.isActive, true), lte(shopReminders.remindAt, now)));

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
