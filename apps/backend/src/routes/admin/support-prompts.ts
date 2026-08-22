import { Hono } from "hono";
import { z } from "zod";

import { supportPromptInputSchema, supportPromptLimitsSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deleteSupportPrompt,
  getSupportPrompt,
  insertSupportPrompt,
  listSupportPrompts,
  updateSupportPrompt,
} from "../../repositories/support-prompts.js";
import { getSupportPromptLimits, putSupportPromptLimits } from "../../services/support-prompts.js";

/**
 * Managing the asks that appear inside the site.
 *
 * Reading and writing them is owner and admin work, as with every other piece
 * of configuration: what a moderator does is decide about shops.
 */
export const supportPromptRoutes = new Hono<{ Variables: AuthVariables }>();

supportPromptRoutes.use("*", requireAdmin);

const promptIdSchema = z.object({ id: z.string().uuid() });

// GET /api/admin/support-prompts — every prompt, for the list
supportPromptRoutes.get("/support-prompts", async (c) => {
  const prompts = await listSupportPrompts();
  return ok(c, prompts);
});

// GET /api/admin/support-prompts/limits — what bounds every prompt together
supportPromptRoutes.get("/support-prompts/limits", async (c) => {
  return ok(c, await getSupportPromptLimits());
});

// PUT /api/admin/support-prompts/limits
supportPromptRoutes.put(
  "/support-prompts/limits",
  validate("json", supportPromptLimitsSchema),
  async (c) => {
    const limits = c.req.valid("json");
    await putSupportPromptLimits(limits);
    return ok(c, limits);
  },
);

// POST /api/admin/support-prompts — create one
supportPromptRoutes.post(
  "/support-prompts",
  validate("json", supportPromptInputSchema),
  async (c) => {
    const created = await insertSupportPrompt(c.req.valid("json"));
    return ok(c, created);
  },
);

// GET /api/admin/support-prompts/:id
supportPromptRoutes.get("/support-prompts/:id", validate("param", promptIdSchema), async (c) => {
  const prompt = await getSupportPrompt(c.req.valid("param").id);
  if (!prompt) return fail(c, 404, "Not found");
  return ok(c, prompt);
});

// PUT /api/admin/support-prompts/:id
supportPromptRoutes.put(
  "/support-prompts/:id",
  validate("param", promptIdSchema),
  validate("json", supportPromptInputSchema),
  async (c) => {
    const updated = await updateSupportPrompt(c.req.valid("param").id, c.req.valid("json"));
    if (!updated) return fail(c, 404, "Not found");
    return ok(c, updated);
  },
);

// DELETE /api/admin/support-prompts/:id
supportPromptRoutes.delete("/support-prompts/:id", validate("param", promptIdSchema), async (c) => {
  const removed = await deleteSupportPrompt(c.req.valid("param").id);
  if (!removed) return fail(c, 404, "Not found");
  return ok(c, { message: "Support prompt deleted" });
});
