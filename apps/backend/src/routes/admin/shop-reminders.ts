import { Hono } from "hono";
import { z } from "zod";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deleteReminderById,
  getReminder,
  upsertReminder,
} from "../../repositories/shop-reminders.js";

const reminderBodySchema = z.object({
  remindAt: z.string().datetime(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  recurrence: z.enum(["never", "daily", "weekly", "monthly", "yearly", "custom"]).optional(),
  recurrenceCustomDays: z.number().int().min(1).max(3650).nullable().optional(),
  recurrenceUnit: z.enum(["days", "weeks", "months", "years"]).nullable().optional(),
  recurrenceDaysOfWeek: z.string().nullable().optional(),
  sendEmail: z.boolean().optional(),
  emailTemplateId: z.number().int().positive().nullable().optional(),
});

/**
 * Shop reminder routes mounted under `/shops/:id/reminder`.
 */
export const shopRemindersRoutes = new Hono<{ Variables: AuthVariables }>();

shopRemindersRoutes.get("/shops/:id/reminder", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const adminId = c.get("adminId");
  const reminder = await getReminder(id, adminId);
  return ok(c, reminder);
});

shopRemindersRoutes.post("/shops/:id/reminder", validate("json", reminderBodySchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const adminId = c.get("adminId");
  const {
    remindAt,
    note,
    isActive,
    recurrence,
    recurrenceCustomDays,
    recurrenceUnit,
    recurrenceDaysOfWeek,
    sendEmail,
    emailTemplateId,
  } = c.req.valid("json");
  await upsertReminder(
    id,
    adminId,
    new Date(remindAt),
    note ?? null,
    isActive ?? true,
    recurrence ?? "never",
    recurrenceCustomDays ?? null,
    recurrenceUnit ?? null,
    recurrenceDaysOfWeek ?? null,
    sendEmail ?? false,
    emailTemplateId ?? null,
  );
  const reminder = await getReminder(id, adminId);
  return ok(c, reminder, 201);
});

shopRemindersRoutes.delete("/shops/:id/reminder", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid id");
  const adminId = c.get("adminId");
  const reminder = await getReminder(id, adminId);
  if (!reminder) return fail(c, 404, "Reminder not found");
  await deleteReminderById(reminder.id);
  return ok(c, null);
});
