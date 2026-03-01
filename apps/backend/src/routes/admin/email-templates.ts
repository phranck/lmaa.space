import { zValidator } from "@hono/zod-validator";
import { strToU8, zipSync } from "fflate";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import { renderEmailPreview } from "../../services/email-renderer.js";
import {
  createManagedEmailTemplate,
  deleteManagedEmailTemplate,
  getManagedEmailTemplateById,
  getManagedEmailTemplates,
  importManagedEmailTemplate,
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

// GET /api/admin/email-templates/export — download all as ZIP
emailTemplateRoutes.get("/email-templates/export", requireAuth, async (c) => {
  const templates = await getManagedEmailTemplates();
  const exportedAt = new Date().toISOString();

  const files: Record<string, Uint8Array> = {};
  for (const { id: _id, createdAt: _c, updatedAt: _u, ...fields } of templates) {
    const json = JSON.stringify({ version: 1, exportedAt, ...fields }, null, 2);
    files[`${fields.name}.json`] = strToU8(json);
  }

  const zip = zipSync(files);

  return c.body(zip.buffer as ArrayBuffer, 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": 'attachment; filename="email-templates.zip"',
  });
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

const emailTemplatePreviewSchema = z.object({
  headerBannerUrl: z.string().nullish(),
  headerText: z.string().nullish(),
  bodyText: z.string().default(""),
  footerText: z.string().nullish(),
  footerBannerUrl: z.string().nullish(),
  colorScheme: z.enum(["light", "dark"]).default("light"),
});

const emailTemplateImportSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  headerBannerUrl: z.string().url().or(z.literal("")).nullish(),
  headerText: z.string().max(50000).nullish(),
  bodyText: z.string().max(50000),
  footerBannerUrl: z.string().url().or(z.literal("")).nullish(),
  footerText: z.string().max(50000).nullish(),
  isSystemTemplate: z.boolean().optional(),
  overwrite: z.boolean().default(false),
});

// POST /api/admin/email-templates/preview — render preview HTML
emailTemplateRoutes.post(
  "/email-templates/preview",
  requireAuth,
  zValidator("json", emailTemplatePreviewSchema),
  (c) => {
    const { colorScheme, ...fields } = c.req.valid("json");
    const html = renderEmailPreview(fields, colorScheme);
    return ok(c, { html });
  },
);

// POST /api/admin/email-templates/import — import single template (create or overwrite)
emailTemplateRoutes.post(
  "/email-templates/import",
  requireAuth,
  zValidator("json", emailTemplateImportSchema),
  async (c) => {
    const { overwrite, ...data } = c.req.valid("json");
    const result = await importManagedEmailTemplate(data, overwrite);
    if (!result.ok) return fail(c, 409, "Template name already exists");
    return ok(c, result.data, 201);
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
