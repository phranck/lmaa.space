import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  mastodonPostTemplateCreateSchema,
  mastodonPostTemplateUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createManagedMastodonPostTemplate,
  deleteManagedMastodonPostTemplate,
  getManagedMastodonPostTemplateById,
  getManagedMastodonPostTemplates,
  updateManagedMastodonPostTemplate,
} from "../../services/mastodon-post-templates.js";

export const mastodonPostTemplateRoutes = new Hono<{ Variables: AuthVariables }>();

mastodonPostTemplateRoutes.use("*", requireAdmin);

mastodonPostTemplateRoutes.get("/mastodon-post-templates", async (c) => {
  const templates = await getManagedMastodonPostTemplates();
  return ok(c, templates);
});

mastodonPostTemplateRoutes.get("/mastodon-post-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await getManagedMastodonPostTemplateById(id);
  if (!result.ok) return fail(c, 404, "Mastodon post template not found");
  return ok(c, result.data);
});

mastodonPostTemplateRoutes.post(
  "/mastodon-post-templates",
  zValidator("json", mastodonPostTemplateCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const safePayload = c.get("isOwner")
      ? payload
      : { ...payload, isSystemTemplate: undefined };
    const result = await createManagedMastodonPostTemplate(safePayload);
    if (!result.ok) return fail(c, 409, "Template name already exists");
    return ok(c, result.data, 201);
  },
);

mastodonPostTemplateRoutes.put(
  "/mastodon-post-templates/:id",
  zValidator("json", mastodonPostTemplateUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    const safePayload = c.get("isOwner")
      ? payload
      : { ...payload, isSystemTemplate: undefined };
    const result = await updateManagedMastodonPostTemplate(id, safePayload);
    if (!result.ok) return fail(c, 404, "Mastodon post template not found");
    return ok(c, result.data);
  },
);

mastodonPostTemplateRoutes.delete("/mastodon-post-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedMastodonPostTemplate(id);
  if (!result.ok) return fail(c, 404, "Mastodon post template not found");
  return ok(c, { deleted: true });
});
