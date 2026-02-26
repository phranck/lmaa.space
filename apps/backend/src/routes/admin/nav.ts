import { zValidator } from "@hono/zod-validator";
import type { NavId } from "@lmaa/shared";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import { getManagedNavItems, replaceManagedNavItems } from "../../services/admin-nav.js";

const navItemsSchema = z.object({
  items: z.array(
    z.object({
      pageSlug: z.string().min(1).nullish(),
      url: z.string().min(1).nullish(),
      label: z.string().max(100).nullish(),
      target: z.enum(["_self", "_blank"]).default("_self"),
    }),
  ),
});

export const navAdminRoutes = new Hono<{ Variables: AuthVariables }>();

function parseNavId(navId: string): NavId | null {
  if (navId === "header" || navId === "footer") {
    return navId;
  }

  return null;
}

// ─── GET /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.get("/nav/:navId", requireAuth, requireAdmin, async (c) => {
  const navId = parseNavId(c.req.param("navId"));
  if (!navId) {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await getManagedNavItems(navId);
  return ok(c, rows);
});

// ─── PUT /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.put(
  "/nav/:navId",
  requireAuth,
  requireAdmin,
  zValidator("json", navItemsSchema),
  async (c) => {
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
  },
);
