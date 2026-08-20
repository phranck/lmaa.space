import { Hono } from "hono";

import {
  createFormConfigSchema,
  formConfigActiveSchema,
  formConfigPayloadSchema,
  importFormConfigSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  createManagedAdminFormConfig,
  deleteManagedAdminFormConfig,
  getManagedAdminFormConfigByName,
  getManagedAdminFormConfigs,
  importManagedFormConfig,
  saveManagedAdminFormConfig,
  setManagedAdminFormConfigActive,
} from "../../services/admin-form-config.js";

/**
 * Admin form configuration CRUD routes.
 */
export const formConfigRoutes = new Hono<{ Variables: AuthVariables }>();

formConfigRoutes.use("*", requireAdmin);

// DELETE /api/admin/form-configs/:name — delete a form config
formConfigRoutes.delete("/form-configs/:name", async (c) => {
  const result = await deleteManagedAdminFormConfig(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  return ok(c, { deleted: true });
});

// GET /api/admin/form-configs — list all configs
formConfigRoutes.get("/form-configs", async (c) => {
  const configs = await getManagedAdminFormConfigs();
  return ok(c, configs);
});

// POST /api/admin/form-configs/import — import a form config (must be before /:name)
formConfigRoutes.post(
  "/form-configs/import",
  validate("json", importFormConfigSchema),
  async (c) => {
    const { name, overwrite, ...payload } = c.req.valid("json");
    const result = await importManagedFormConfig(name, payload, overwrite ?? false);
    if (!result.ok) {
      if (result.reason === "name_taken") return fail(c, 409, "Form name already exists");
      return fail(c, 500, "Unexpected error");
    }
    return ok(c, result.data);
  },
);

// GET /api/admin/form-configs/:name — get by name
formConfigRoutes.get("/form-configs/:name", async (c) => {
  const result = await getManagedAdminFormConfigByName(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  return ok(c, result.data);
});

// POST /api/admin/form-configs — create new empty form
formConfigRoutes.post("/form-configs", validate("json", createFormConfigSchema), async (c) => {
  const { name, slug } = c.req.valid("json");
  const result = await createManagedAdminFormConfig(name, slug ?? name);
  if (!result.ok) {
    if (result.reason === "name_taken") return fail(c, 409, "Form name already exists");
    if (result.reason === "slug_taken") return fail(c, 409, "Slug already in use");
    return fail(c, 500, "Unexpected error");
  }
  return ok(c, result.data);
});

// PUT /api/admin/form-configs/:name — upsert
formConfigRoutes.put(
  "/form-configs/:name",
  validate("json", formConfigPayloadSchema),
  async (c) => {
    const name = c.req.param("name");
    const payload = c.req.valid("json");
    const result = await saveManagedAdminFormConfig(name, payload);
    if (!result.ok) {
      if (result.reason === "slug_taken") return fail(c, 409, "Slug already in use");
      return fail(c, 500, "Unexpected error");
    }
    return ok(c, result.data);
  },
);

// PATCH /api/admin/form-configs/:name/active — set active state
formConfigRoutes.patch(
  "/form-configs/:name/active",
  validate("json", formConfigActiveSchema),
  async (c) => {
    const name = c.req.param("name");
    const { isActive } = c.req.valid("json");
    const result = await setManagedAdminFormConfigActive(name, isActive);
    if (!result.ok) return fail(c, 404, "Form config not found");
    return ok(c, result.data);
  },
);
