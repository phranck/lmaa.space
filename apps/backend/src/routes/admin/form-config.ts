import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  createManagedAdminFormConfig,
  deleteManagedAdminFormConfig,
  getManagedAdminFormConfigByName,
  getManagedAdminFormConfigs,
  importManagedFormConfig,
  saveManagedAdminFormConfig,
} from "../../services/admin-form-config.js";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits and hyphens only")
  .optional();

const formFieldValidationSchema = z
  .object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    pattern: z.string().max(500).optional(),
  })
  .optional();

const buttonActionSchema = z.object({
  type: z.enum(["open-url", "copy-clipboard", "clear-field"]),
  sourceFieldId: z.string().min(1).max(100),
});

const submissionStepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("store") }),
  z.object({ type: z.literal("create-shop-suggestion") }),
  z.object({
    type: z.literal("email"),
    to: z.string().max(500),
    toFieldId: z.string().max(100).optional(),
    subject: z.string().max(500).optional(),
    replyToFieldId: z.string().max(100).optional(),
  }),
]);

const submissionConfigSchema = z.object({
  steps: z.array(submissionStepSchema),
  successMessage: z.string().max(1000).optional(),
  successRedirectUrl: z.string().max(2000).optional(),
});

const formFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum([
    "text",
    "email",
    "textarea",
    "select",
    "multi-select",
    "checkbox",
    "richtext",
    "button",
    "password",
    "headline",
    "separator",
    "paragraph",
  ]),
  label: z.string().max(200),
  placeholder: z.string().max(200).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(200)).optional(),
  optionsSource: z.enum(["categories", "regions"]).optional(),
  width: z.enum(["full", "half"]).optional(),
  span: z.number().int().min(1).max(12).optional(),
  validation: formFieldValidationSchema,
  content: z.string().max(50000).optional(),
  variant: z.enum(["default", "info", "warning", "hint"]).optional(),
  buttonType: z.enum(["button", "submit", "reset"]).optional(),
  buttonWidth: z.enum(["automatic", "full"]).optional(),
  buttonAlign: z.enum(["left", "center", "right"]).optional(),
  buttonIcon: z.string().max(100).optional(),
  buttonDisplay: z.enum(["text", "icon", "both"]).optional(),
  headlineLevel: z.enum(["h1", "h2", "h3"]).optional(),
  rows: z.number().int().min(1).max(20).optional(),
  name: z.string().max(200).optional(),
  subtext: z.string().max(500).optional(),
  buttonAction: buttonActionSchema.optional(),
});

const formRowSchema = z.object({
  id: z.string().min(1).max(100),
  fields: z.array(formFieldSchema).min(1),
});

const formConfigPayloadSchema = z.object({
  slug: slugSchema,
  rows: z.array(formRowSchema),
  submissionConfig: submissionConfigSchema.optional(),
});

const createFormConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Name must be lowercase letters, digits and hyphens only"),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, digits and hyphens only")
    .optional(),
});

const importFormConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Name must be lowercase letters, digits and hyphens only"),
  slug: slugSchema,
  rows: z.array(formRowSchema),
  submissionConfig: submissionConfigSchema.optional(),
  overwrite: z.boolean().optional(),
});

/**
 * Admin form configuration CRUD routes.
 */
export const formConfigRoutes = new Hono<{ Variables: AuthVariables }>();

// DELETE /api/admin/form-configs/:name — delete a form config
formConfigRoutes.delete("/form-configs/:name", requireAuth, async (c) => {
  const result = await deleteManagedAdminFormConfig(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  return ok(c, { deleted: true });
});

// GET /api/admin/form-configs — list all configs
formConfigRoutes.get("/form-configs", requireAuth, async (c) => {
  const configs = await getManagedAdminFormConfigs();
  return ok(c, configs);
});

// POST /api/admin/form-configs/import — import a form config (must be before /:name)
formConfigRoutes.post(
  "/form-configs/import",
  requireAuth,
  zValidator("json", importFormConfigSchema),
  async (c) => {
    const { name, overwrite, ...payload } = c.req.valid("json");
    const result = await importManagedFormConfig(name, payload, overwrite ?? false);
    if (!result.ok) {
      if (result.reason === "name_taken") return fail(c, 409, "Form name already exists");
    }
    return ok(c, result.ok ? result.data : null);
  },
);

// GET /api/admin/form-configs/:name — get by name
formConfigRoutes.get("/form-configs/:name", requireAuth, async (c) => {
  const result = await getManagedAdminFormConfigByName(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  return ok(c, result.data);
});

// POST /api/admin/form-configs — create new empty form
formConfigRoutes.post(
  "/form-configs",
  requireAuth,
  zValidator("json", createFormConfigSchema),
  async (c) => {
    const { name, slug } = c.req.valid("json");
    const result = await createManagedAdminFormConfig(name, slug ?? name);
    if (!result.ok) {
      if (result.reason === "name_taken") return fail(c, 409, "Form name already exists");
      if (result.reason === "slug_taken") return fail(c, 409, "Slug already in use");
    }
    return ok(c, result.ok ? result.data : null);
  },
);

// PUT /api/admin/form-configs/:name — upsert
formConfigRoutes.put(
  "/form-configs/:name",
  requireAuth,
  zValidator("json", formConfigPayloadSchema),
  async (c) => {
    const name = c.req.param("name");
    const payload = c.req.valid("json");
    const result = await saveManagedAdminFormConfig(name, payload);
    if (!result.ok) {
      if (result.reason === "slug_taken") return fail(c, 409, "Slug already in use");
    }
    return ok(c, result.ok ? result.data : null);
  },
);
