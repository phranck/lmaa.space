import { zValidator } from "@hono/zod-validator";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { contentPages, navItems } from "../../db/schema.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";

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

// ─── GET /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.get("/nav/:navId", requireAuth, requireAdmin, async (c) => {
  const navId = c.req.param("navId");
  if (navId !== "header" && navId !== "footer") {
    return c.json({ error: { message: "Invalid navId" } }, 400);
  }

  const rows = await db
    .select({
      id: navItems.id,
      navId: navItems.navId,
      pageSlug: navItems.pageSlug,
      pageTitle: contentPages.title,
      url: navItems.url,
      target: navItems.target,
      label: navItems.label,
      position: navItems.position,
    })
    .from(navItems)
    .leftJoin(contentPages, eq(navItems.pageSlug, contentPages.slug))
    .where(eq(navItems.navId, navId))
    .orderBy(asc(navItems.position));

  return c.json({ data: rows });
});

// ─── PUT /admin/nav/:navId ────────────────────────────────────────────────────

navAdminRoutes.put(
  "/nav/:navId",
  requireAuth,
  requireAdmin,
  zValidator("json", navItemsSchema),
  async (c) => {
    const navId = c.req.param("navId");
    if (navId !== "header" && navId !== "footer") {
      return c.json({ error: { message: "Invalid navId" } }, 400);
    }

    const { items } = c.req.valid("json");

    await db.transaction(async (tx) => {
      await tx.delete(navItems).where(eq(navItems.navId, navId));
      if (items.length > 0) {
        await tx.insert(navItems).values(
          items.map((item, i) => ({
            navId: navId as "header" | "footer",
            pageSlug: item.pageSlug ?? null,
            url: item.url ?? null,
            target: item.target,
            position: i,
            label: item.label ?? null,
          })),
        );
      }
    });

    const updated = await db
      .select({
        id: navItems.id,
        navId: navItems.navId,
        pageSlug: navItems.pageSlug,
        pageTitle: contentPages.title,
        url: navItems.url,
        target: navItems.target,
        label: navItems.label,
        position: navItems.position,
      })
      .from(navItems)
      .leftJoin(contentPages, eq(navItems.pageSlug, contentPages.slug))
      .where(eq(navItems.navId, navId))
      .orderBy(asc(navItems.position));

    return c.json({ data: updated });
  },
);
