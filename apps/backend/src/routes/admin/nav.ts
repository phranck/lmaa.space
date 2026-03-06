import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { navItemsSchema } from "@lmaa/contracts";
import type { NavId } from "@lmaa/shared";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { getManagedNavItems, replaceManagedNavItems } from "../../services/admin-nav.js";

/**
 * Admin navigation editor routes (`/nav/:navId`).
 */
export const navAdminRoutes = new Hono<{ Variables: AuthVariables }>();

/**
 * Converts untrusted route params into a valid `NavId`.
 *
 * @param navId - Raw param value.
 * @returns `header`/`footer` when valid, otherwise `null`.
 */
function parseNavId(navId: string): NavId | null {
  if (navId === "header" || navId === "footer") {
    return navId;
  }

  return null;
}

// ─── GET /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.get("/nav/:navId", requireAdmin, async (c) => {
  const navId = parseNavId(c.req.param("navId"));
  if (!navId) {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await getManagedNavItems(navId);
  return ok(c, rows);
});

// ─── PUT /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.put("/nav/:navId", requireAdmin, zValidator("json", navItemsSchema), async (c) => {
  const navId = parseNavId(c.req.param("navId"));
  if (!navId) {
    return fail(c, 400, "Invalid navId");
  }

  const { items } = c.req.valid("json");
  const updated = await replaceManagedNavItems(
    navId,
    items.map((item) => ({
      pageSlug: item.pageSlug ?? null,
      url: item.url ?? null,
      target: item.target,
      label: item.label ?? null,
    })),
  );

  return ok(c, updated);
});
