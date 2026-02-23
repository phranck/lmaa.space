import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { contentPages } from "../../db/schema.js";
import { type AuthVariables, requireAuth } from "../../middleware/auth.js";

const contentUpdateSchema = z.object({
  content: z.string().max(100_000),
});

export const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/content/:slug
contentRoutes.get("/content/:slug", requireAuth, async (c) => {
  const slug = c.req.param("slug");
  const [page] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!page) return c.json({ error: { message: "Not found" } }, 404);
  return c.json({ data: page });
});

// PUT /api/admin/content/:slug
contentRoutes.put(
  "/content/:slug",
  requireAuth,
  zValidator("json", contentUpdateSchema),
  async (c) => {
    const slug = c.req.param("slug");
    const { content } = c.req.valid("json");
    const [updated] = await db
      .update(contentPages)
      .set({ content, updatedAt: new Date() })
      .where(eq(contentPages.slug, slug))
      .returning();
    if (!updated) return c.json({ error: { message: "Not found" } }, 404);
    return c.json({ data: updated });
  },
);
