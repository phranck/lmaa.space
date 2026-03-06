import { zValidator } from "@hono/zod-validator";
import { strToU8, zipSync } from "fflate";
import { Hono } from "hono";

import {
  emailTemplateCreateSchema,
  emailTemplateImportSchema,
  emailTemplatePreviewSchema,
  emailTemplateUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { renderEmailPreview } from "../../services/email-renderer.js";
import {
  createManagedEmailTemplate,
  deleteManagedEmailTemplate,
  getManagedEmailTemplateById,
  getManagedEmailTemplates,
  importManagedEmailTemplate,
  updateManagedEmailTemplate,
} from "../../services/email-templates.js";

/**
 * Admin email template CRUD routes.
 */
export const emailTemplateRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/email-templates — list all
emailTemplateRoutes.get("/email-templates", async (c) => {
  const templates = await getManagedEmailTemplates();
  return ok(c, templates);
});

// GET /api/admin/email-templates/export — download all as ZIP
emailTemplateRoutes.get("/email-templates/export", async (c) => {
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
emailTemplateRoutes.get("/email-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await getManagedEmailTemplateById(id);
  if (!result.ok) return fail(c, 404, "Email template not found");
  return ok(c, result.data);
});

// POST /api/admin/email-templates — create
emailTemplateRoutes.post(
  "/email-templates",
  zValidator("json", emailTemplateCreateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const result = await createManagedEmailTemplate(data);
    if (!result.ok) {
      if (result.reason === "name_taken") return fail(c, 409, "Template name already exists");
      return fail(c, 500, "Unexpected error");
    }
    return ok(c, result.data, 201);
  },
);

// PUT /api/admin/email-templates/:id — update
emailTemplateRoutes.put(
  "/email-templates/:id",
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

// POST /api/admin/email-templates/preview — render preview HTML
emailTemplateRoutes.post(
  "/email-templates/preview",
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
  zValidator("json", emailTemplateImportSchema),
  async (c) => {
    const { overwrite, ...data } = c.req.valid("json");
    const result = await importManagedEmailTemplate(data, overwrite);
    if (!result.ok) return fail(c, 409, "Template name already exists");
    return ok(c, result.data, 201);
  },
);

// DELETE /api/admin/email-templates/:id — delete
emailTemplateRoutes.delete("/email-templates/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedEmailTemplate(id);
  if (!result.ok) return fail(c, 404, "Email template not found");
  return ok(c, { deleted: true });
});
