import { Hono } from "hono";
import { z } from "zod";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { deleteSetting, getSettings, putSetting } from "../../repositories/app-settings.js";

const bulkGetSchema = z.object({
  keys: z.array(z.string().min(1)),
});

const putSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const deleteSettingSchema = z.object({
  key: z.string().min(1),
});

export const settingsRoutes = new Hono<{ Variables: AuthVariables }>();

// App settings are owner/admin-only; moderators must not read or mutate them.
settingsRoutes.use("*", requireAdmin);

// POST /api/admin/settings/bulk - get multiple settings at once
settingsRoutes.post("/settings/bulk", async (c) => {
  const body = bulkGetSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");
  const result = await getSettings(body.data.keys);
  return ok(c, result);
});

// PUT /api/admin/settings - upsert a setting
settingsRoutes.put("/settings", async (c) => {
  const body = putSettingSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");
  await putSetting(body.data.key, body.data.value);
  return ok(c, { key: body.data.key, value: body.data.value });
});

// DELETE /api/admin/settings - delete a setting
settingsRoutes.delete("/settings", async (c) => {
  const body = deleteSettingSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");
  await deleteSetting(body.data.key);
  return ok(c, { message: "Setting deleted" });
});
