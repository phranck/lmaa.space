import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";
import {
  getManagedAdminFormConfigByName,
  getManagedAdminFormConfigs,
  saveManagedAdminFormConfig,
} from "../../services/admin-form-config.js";

const formFieldValidationSchema = z
  .object({
    min: z.number().int().nonnegative().optional(),
    max: z.number().int().positive().optional(),
    pattern: z.string().max(500).optional(),
  })
  .optional();

const formFieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["text", "email", "textarea", "select", "multi-select", "checkbox", "richtext"]),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).optional(),
  required: z.boolean(),
  options: z.array(z.string().max(200)).optional(),
  optionsSource: z.enum(["categories", "regions"]).optional(),
  width: z.enum(["full", "half"]),
  validation: formFieldValidationSchema,
  content: z.string().max(50000).optional(),
  variant: z.enum(["default", "info", "warning", "hint"]).optional(),
});

const formRowSchema = z.object({
  id: z.string().min(1).max(100),
  fields: z.array(formFieldSchema).min(1).max(2),
});

const formConfigPayloadSchema = z.object({
  rows: z.array(formRowSchema),
});

/**
 * Admin form configuration CRUD routes.
 */
export const formConfigRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/form-configs — list all configs
formConfigRoutes.get("/form-configs", requireAuth, async (c) => {
  const configs = await getManagedAdminFormConfigs();
  return ok(c, configs);
});

// GET /api/admin/form-configs/:name — get by name
formConfigRoutes.get("/form-configs/:name", requireAuth, async (c) => {
  const result = await getManagedAdminFormConfigByName(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  return ok(c, result.data);
});

// PUT /api/admin/form-configs/:name — upsert
formConfigRoutes.put(
  "/form-configs/:name",
  requireAuth,
  zValidator("json", formConfigPayloadSchema),
  async (c) => {
    const name = c.req.param("name");
    const payload = c.req.valid("json");
    const config = await saveManagedAdminFormConfig(name, payload);
    return ok(c, config);
  },
);
