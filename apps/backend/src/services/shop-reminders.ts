import { renderEmailTemplate } from "./email-renderer.js";
import { sendMail } from "./email.js";
import { sendPushNotification } from "./push-notifications.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  advanceReminderDate,
  deleteReminderById,
  getDueReminders,
} from "../repositories/shop-reminders.js";
import type { DueReminder } from "../repositories/shop-reminders.js";

function getNextCustomRemindAt(reminder: DueReminder): Date {
  const base = new Date(reminder.remindAt);
  const interval = reminder.recurrenceCustomDays ?? 1;
  const unit = reminder.recurrenceUnit ?? "days";

  if (unit === "weeks" && reminder.recurrenceDaysOfWeek) {
    const days = reminder.recurrenceDaysOfWeek
      .split(",")
      .map(Number)
      .filter((d) => d >= 1 && d <= 7)
      .sort((a, b) => a - b);

    if (days.length > 0) {
      const jsDay = base.getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;

      const nextInWeek = days.find((d) => d > isoDay);
      if (nextInWeek) {
        const result = new Date(base);
        result.setDate(base.getDate() + (nextInWeek - isoDay));
        return result;
      }

      const daysUntilNextMonday = 8 - isoDay;
      const daysIntoNewWeek = days[0] - 1;
      const result = new Date(base);
      result.setDate(base.getDate() + daysUntilNextMonday + (interval - 1) * 7 + daysIntoNewWeek);
      return result;
    }
  }

  const result = new Date(base);
  switch (unit) {
    case "weeks":
      result.setDate(base.getDate() + interval * 7);
      break;
    case "months":
      result.setMonth(base.getMonth() + interval);
      break;
    case "years":
      result.setFullYear(base.getFullYear() + interval);
      break;
    default:
      result.setDate(base.getDate() + interval);
  }
  return result;
}

function getNextRemindAt(reminder: DueReminder): Date | null {
  const base = new Date(reminder.remindAt);
  switch (reminder.recurrence) {
    case "daily":
      base.setDate(base.getDate() + 1);
      return base;
    case "weekly":
      base.setDate(base.getDate() + 7);
      return base;
    case "monthly":
      base.setMonth(base.getMonth() + 1);
      return base;
    case "yearly":
      base.setFullYear(base.getFullYear() + 1);
      return base;
    case "custom":
      return getNextCustomRemindAt(reminder);
    default:
      return null;
  }
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "täglich",
  weekly: "wöchentlich",
  monthly: "monatlich",
  yearly: "jährlich",
  custom: "wiederkehrend",
};

function buildReminderHtml(reminder: DueReminder): string {
  const dateStr = reminder.remindAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const escapedName = reminder.shopName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const noteBlock = reminder.note
    ? `<p style="margin:12px 0"><strong>Notiz:</strong> ${reminder.note.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    : "";
  const recurrenceLabel =
    reminder.recurrence !== "never" ? RECURRENCE_LABELS[reminder.recurrence] ?? "" : "";
  const recurrenceBlock = recurrenceLabel
    ? `<p style="color:#888;font-size:12px">Wiederholung: ${recurrenceLabel}</p>`
    : "";
  return `<p>Du hast eine Erinnerung für den Shop <strong>${escapedName}</strong> gesetzt.</p>${noteBlock}<p style="color:#888;font-size:12px">Fällig: ${dateStr}</p>${recurrenceBlock}`;
}

async function sendReminderEmail(reminder: DueReminder): Promise<boolean> {
  if (!reminder.sendEmail) return true;

  if (reminder.emailTemplate) {
    const variables: Record<string, string> = {
      shopName: reminder.shopName,
      reminderMessage: reminder.note ?? "",
      shopUrl: `${env.DASHBOARD_URL}/shops/${reminder.shopId}`,
    };
    const { html, subject } = await renderEmailTemplate(reminder.emailTemplate, variables);
    return sendMail(reminder.adminEmail, subject, html);
  }

  const subject = `Erinnerung: Shop \u201E${reminder.shopName}\u201C prüfen`;
  const html = buildReminderHtml(reminder);
  return sendMail(reminder.adminEmail, subject, html);
}

async function processReminders(): Promise<void> {
  const due = await getDueReminders();
  for (const reminder of due) {
    const emailSent = await sendReminderEmail(reminder);
    if (!emailSent) {
      logger.warn({ shopId: reminder.shopId }, "reminder: email failed, will retry next tick");
      continue;
    }

    await sendPushNotification(reminder.adminId, {
      title: `Erinnerung: ${reminder.shopName}`,
      body: reminder.note ?? `Shop "${reminder.shopName}" prüfen`,
      url: `/shops/${reminder.shopId}`,
    });

    const nextDate = getNextRemindAt(reminder);
    if (nextDate) {
      await advanceReminderDate(reminder.id, nextDate);
      logger.info(
        { shopId: reminder.shopId, nextRemindAt: nextDate },
        "reminder: processed, advanced to next occurrence",
      );
    } else {
      await deleteReminderById(reminder.id);
      logger.info({ shopId: reminder.shopId }, "reminder: processed and deleted");
    }
  }
}

/**
 * Starts the reminder scheduler.
 * Polls every 60 seconds for due reminders, sends email + push, then either
 * advances the date (recurring) or deletes the entry (one-time).
 */
export function startReminderScheduler(): NodeJS.Timeout {
  const intervalMs = 60_000;

  const timer = setInterval(async () => {
    try {
      await processReminders();
    } catch (error) {
      logger.error({ err: error }, "reminder scheduler error");
    }
  }, intervalMs);

  logger.info({ intervalMs }, "reminder scheduler started");
  return timer;
}
