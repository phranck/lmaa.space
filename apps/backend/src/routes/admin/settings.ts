import { Hono } from "hono";
import { z } from "zod";

import { fail, ok } from "../../lib/http.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { deleteSetting, getSettings, putSetting } from "../../repositories/app-settings.js";

const putSettingSchema = z.object({
  value: z.string(),
});

const bulkGetSchema = z.object({
  keys: z.array(z.string().min(1)),
});

export const settingsRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /api/admin/settings/bulk - get multiple settings at once
settingsRoutes.post("/settings/bulk", async (c) => {
  const body = bulkGetSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");
  const result = await getSettings(body.data.keys);
  return ok(c, result);
});

// PUT /api/admin/settings/:key - upsert a setting
settingsRoutes.put("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const body = putSettingSchema.safeParse(await c.req.json());
  if (!body.success) return fail(c, 400, "Invalid request body");
  await putSetting(key, body.data.value);
  return ok(c, { key, value: body.data.value });
});

// DELETE /api/admin/settings/:key - delete a setting
settingsRoutes.delete("/settings/:key", async (c) => {
  const key = c.req.param("key");
  await deleteSetting(key);
  return ok(c, { message: "Setting deleted" });
});
