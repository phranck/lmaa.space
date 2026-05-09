import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { SOCIAL_MEDIA_POST_TEMPLATE_SCOPES } from "@lmaa/contracts";

import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { listChoicesForAdminUser } from "../../repositories/admin-user-account-template-choice.js";

const querySchema = z.object({
  scope: z.enum(SOCIAL_MEDIA_POST_TEMPLATE_SCOPES),
});

export const meTemplateChoicesRoutes = new Hono<{ Variables: AuthVariables }>();

meTemplateChoicesRoutes.use("*", requireAdmin);

meTemplateChoicesRoutes.get(
  "/me/template-choices",
  zValidator("query", querySchema),
  async (c) => {
    const adminId = c.get("adminId");
    const { scope } = c.req.valid("query");
    const rows = await listChoicesForAdminUser(adminId, scope);
    const map: Record<number, number | null> = {};
    for (const row of rows) {
      map[row.socialMediaAccountId] = row.templateId;
    }
    return ok(c, map);
  },
);
