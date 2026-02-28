import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  createManagedEmailTemplate,
  deleteManagedEmailTemplate,
  getManagedEmailTemplateById,
  getManagedEmailTemplates,
  updateManagedEmailTemplate,
} from "../../services/email-templates.js";

const emailTemplateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  headerBannerUrl: z.string().url().optional().or(z.literal("")),
  headerText: z.string().max(50000).optional(),
  bodyText: z.string().max(50000),
  footerBannerUrl: z.string().url().optional().or(z.literal("")),
  footerText: z.string().max(50000).optional(),
});

const emailTemplateUpdateSchema = emailTemplateCreateSchema.partial().extend({
  subject: z.string().min(1).max(500).optional(),
  bodyText: z.string().max(50000).optional(),
});

/**
 * Admin email template CRUD routes.
 */
export const emailTemplateRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/email-templates — list all
emailTemplateRoutes.get("/email-templates", requireAuth, async (c) => {
  const templates = await getManagedEmailTemplates();
  return ok(c, templates);
});

// GET /api/admin/email-templates/:id — get one
emailTemplateRoutes.get("/email-templates/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, 400, "Invalid ID");
  const result = await getManagedEmailTemplateById(id);
  if (!result.ok) return fail(c, 404, "Email template not found");
  return ok(c, result.data);
});

// POST /api/admin/email-templates — create
emailTemplateRoutes.post(
  "/email-templates",
  requireAuth,
  zValidator("json", emailTemplateCreateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const result = await createManagedEmailTemplate(data);
    if (!result.ok) {
      if (result.reason === "name_taken") return fail(c, 409, "Template name already exists");
    }
    return ok(c, result.ok ? result.data : null, 201);
  },
);

// PUT /api/admin/email-templates/:id — update
emailTemplateRoutes.put(
  "/email-templates/:id",
  requireAuth,
  zValidator("json", emailTemplateUpdateSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) return fail(c, 400, "Invalid ID");
    const data = c.req.valid("json");
    const result = await updateManagedEmailTemplate(id, data);
    if (!result.ok) return fail(c, 404, "Email template not found");
    return ok(c, result.data);
  },
);

// DELETE /api/admin/email-templates/:id — delete
emailTemplateRoutes.delete("/email-templates/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedEmailTemplate(id);
  if (!result.ok) return fail(c, 404, "Email template not found");
  return ok(c, { deleted: true });
});
