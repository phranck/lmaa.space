import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { footerConfigSchema } from "@lmaa/contracts";

import { ok } from "../../lib/http.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { getFooterConfig, upsertFooterConfig } from "../../repositories/footer-config.js";
import { createFooterPreviewSession } from "../../services/footer-preview-store.js";

/**
 * Admin footer-config routes.
 */
export const footerConfigRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /admin/footer-config
footerConfigRoutes.get("/footer-config", async (c) => {
  const config = await getFooterConfig();
  return ok(c, config);
});

// PUT /admin/footer-config
footerConfigRoutes.put(
  "/footer-config",
  zValidator("json", footerConfigSchema),
  async (c) => {
    const config = c.req.valid("json");
    await upsertFooterConfig(config);
    return ok(c, config);
  },
);

// POST /admin/footer-config/preview-sessions
footerConfigRoutes.post(
  "/footer-config/preview-sessions",
  zValidator("json", footerConfigSchema),
  async (c) => {
    const config = c.req.valid("json");
    return ok(c, createFooterPreviewSession(config));
  },
);
