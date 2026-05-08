import { Hono } from "hono";

import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { listChoicesForAdminUser } from "../../repositories/admin-user-account-template-choice.js";

export const meTemplateChoicesRoutes = new Hono<{ Variables: AuthVariables }>();

meTemplateChoicesRoutes.use("*", requireAdmin);

meTemplateChoicesRoutes.get("/me/template-choices", async (c) => {
  const adminId = c.get("adminId");
  const rows = await listChoicesForAdminUser(adminId);
  const map: Record<number, number | null> = {};
  for (const row of rows) {
    map[row.socialMediaAccountId] = row.templateId;
  }
  return ok(c, map);
});
