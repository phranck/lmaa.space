import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import {
  SOCIAL_MEDIA_POST_TEMPLATE_SCOPES,
  socialMediaPostTemplateCreateSchema,
  socialMediaPostTemplateUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createManagedSocialMediaPostTemplate,
  deleteManagedSocialMediaPostTemplate,
  getManagedSocialMediaPostTemplateById,
  getManagedSocialMediaPostTemplates,
  updateManagedSocialMediaPostTemplate,
} from "../../services/social-media-post-templates.js";

const listQuerySchema = z.object({
  scope: z.enum(SOCIAL_MEDIA_POST_TEMPLATE_SCOPES).optional(),
});

export const socialMediaPostTemplateRoutes = new Hono<{ Variables: AuthVariables }>();

socialMediaPostTemplateRoutes.use("*", requireAdmin);

socialMediaPostTemplateRoutes.get(
  "/social-media-post-templates",
  zValidator("query", listQuerySchema),
  async (c) => {
    const { scope } = c.req.valid("query");
    const templates = await getManagedSocialMediaPostTemplates(scope);
    return ok(c, templates);
  },
);

socialMediaPostTemplateRoutes.get("/social-media-post-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await getManagedSocialMediaPostTemplateById(id);
  if (!result.ok) return fail(c, 404, "Social-media post template not found");
  return ok(c, result.data);
});

socialMediaPostTemplateRoutes.post(
  "/social-media-post-templates",
  zValidator("json", socialMediaPostTemplateCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const safePayload = c.get("isOwner")
      ? payload
      : { ...payload, isSystemTemplate: undefined };
    const result = await createManagedSocialMediaPostTemplate(safePayload);
    if (!result.ok) return fail(c, 409, "Template name already exists");
    return ok(c, result.data, 201);
  },
);

socialMediaPostTemplateRoutes.put(
  "/social-media-post-templates/:id",
  zValidator("json", socialMediaPostTemplateUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    const safePayload = c.get("isOwner")
      ? payload
      : { ...payload, isSystemTemplate: undefined };
    const result = await updateManagedSocialMediaPostTemplate(id, safePayload);
    if (!result.ok) return fail(c, 404, "Social-media post template not found");
    return ok(c, result.data);
  },
);

socialMediaPostTemplateRoutes.delete("/social-media-post-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedSocialMediaPostTemplate(id);
  if (!result.ok) return fail(c, 404, "Social-media post template not found");
  return ok(c, { deleted: true });
});
