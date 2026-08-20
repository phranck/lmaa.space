import { Hono } from "hono";

import { markdownWidgetsConfigSchema } from "@lmaa/contracts";

import { ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  getMarkdownWidgetsConfig,
  upsertMarkdownWidgetsConfig,
} from "../../repositories/markdown-widgets.js";

export const markdownWidgetsRoutes = new Hono<{ Variables: AuthVariables }>();

markdownWidgetsRoutes.use("*", requireAdmin);

markdownWidgetsRoutes.get("/markdown-widgets", async (c) => {
  const config = await getMarkdownWidgetsConfig();
  return ok(c, config);
});

markdownWidgetsRoutes.put(
  "/markdown-widgets",
  validate("json", markdownWidgetsConfigSchema),
  async (c) => {
    const config = c.req.valid("json");
    await upsertMarkdownWidgetsConfig(config);
    return ok(c, config);
  },
);
