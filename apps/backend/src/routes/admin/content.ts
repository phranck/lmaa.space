import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/index.js";
import { adminUsers, contentPages } from "../../db/schema.js";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";

const contentUpdateSchema = z.object({
  content: z.string().max(100_000),
});

const contentMetaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt")
    .optional(),
  status: z.enum(["draft", "published", "hidden"]).optional(),
});

const contentCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt"),
  title: z.string().min(1).max(200),
  status: z.enum(["draft", "published", "hidden"]).optional(),
});

// ─── Helper: load usernames for a list of rows ────────────────────────────────

async function buildUserMap(ids: (number | null | undefined)[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id): id is number => id != null))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: adminUsers.id, username: adminUsers.username })
    .from(adminUsers);
  return new Map(rows.map((u) => [u.id, u.username]));
}

export const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── List all pages (without content body) ───────────────────────────────────

contentRoutes.get("/content", requireAuth, requireAdmin, async (c) => {
  const pages = await db
    .select({
      slug: contentPages.slug,
      title: contentPages.title,
      status: contentPages.status,
      createdAt: contentPages.createdAt,
      createdBy: contentPages.createdBy,
      updatedAt: contentPages.updatedAt,
      updatedBy: contentPages.updatedBy,
    })
    .from(contentPages)
    .orderBy(contentPages.title);

  const userMap = await buildUserMap(pages.flatMap((r) => [r.createdBy, r.updatedBy]));

  return ok(
    c,
    pages.map((r) => ({
      slug: r.slug,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      createdByUsername: r.createdBy ? (userMap.get(r.createdBy) ?? null) : null,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      updatedByUsername: r.updatedBy ? (userMap.get(r.updatedBy) ?? null) : null,
    })),
  );
});

// ─── Create page ──────────────────────────────────────────────────────────────

contentRoutes.post(
  "/content",
  requireAuth,
  requireAdmin,
  zValidator("json", contentCreateSchema),
  async (c) => {
    const { slug, title, status = "draft" } = c.req.valid("json");
    const adminId = c.get("adminId");

    const existing = await db
      .select({ slug: contentPages.slug })
      .from(contentPages)
      .where(eq(contentPages.slug, slug))
      .limit(1);
    if (existing.length > 0) {
      return fail(c, 409, "Slug bereits vergeben");
    }

    const [page] = await db
      .insert(contentPages)
      .values({ slug, title, content: "", status, createdBy: adminId })
      .returning();

    const [creator] = await db
      .select({ username: adminUsers.username })
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);

    return ok(
      c,
      {
        slug: page.slug,
        title: page.title,
        status: page.status,
        createdAt: page.createdAt.toISOString(),
        createdByUsername: creator?.username ?? null,
        updatedAt: null,
        updatedByUsername: null,
      },
      201,
    );
  },
);

// ─── Get single page (with content) ──────────────────────────────────────────

contentRoutes.get("/content/:slug", requireAuth, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const [page] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!page) return fail(c, 404, "Not found");

  const userMap = await buildUserMap([page.createdBy, page.updatedBy]);

  return ok(c, {
    slug: page.slug,
    title: page.title,
    content: page.content,
    status: page.status,
    createdAt: page.createdAt.toISOString(),
    createdByUsername: page.createdBy ? (userMap.get(page.createdBy) ?? null) : null,
    updatedAt: page.updatedAt ? page.updatedAt.toISOString() : null,
    updatedByUsername: page.updatedBy ? (userMap.get(page.updatedBy) ?? null) : null,
  });
});

// ─── Update content body ──────────────────────────────────────────────────────

contentRoutes.put(
  "/content/:slug",
  requireAuth,
  requireAdmin,
  zValidator("json", contentUpdateSchema),
  async (c) => {
    const slug = c.req.param("slug");
    const { content } = c.req.valid("json");
    const adminId = c.get("adminId");

    const [updated] = await db
      .update(contentPages)
      .set({ content, updatedAt: new Date(), updatedBy: adminId })
      .where(eq(contentPages.slug, slug))
      .returning();
    if (!updated) return fail(c, 404, "Not found");

    const [editor] = await db
      .select({ username: adminUsers.username })
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);

    return ok(c, {
      slug: updated.slug,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
      updatedByUsername: editor?.username ?? null,
    });
  },
);

// ─── Update metadata (title, slug, status) ───────────────────────────────────

contentRoutes.patch(
  "/content/:slug",
  requireAuth,
  requireAdmin,
  zValidator("json", contentMetaSchema),
  async (c) => {
    const currentSlug = c.req.param("slug");
    const { title, slug: newSlug, status } = c.req.valid("json");
    const adminId = c.get("adminId");

    if (newSlug !== undefined && newSlug !== currentSlug) {
      const existing = await db
        .select({ slug: contentPages.slug })
        .from(contentPages)
        .where(eq(contentPages.slug, newSlug))
        .limit(1);
      if (existing.length > 0) {
        return fail(c, 409, "Slug bereits vergeben");
      }
    }

    const updates: Partial<typeof contentPages.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: adminId,
    };
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (newSlug !== undefined) updates.slug = newSlug;

    const [updated] = await db
      .update(contentPages)
      .set(updates)
      .where(eq(contentPages.slug, currentSlug))
      .returning();
    if (!updated) return fail(c, 404, "Not found");

    return ok(c, {
      slug: updated.slug,
      title: updated.title,
      status: updated.status,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
    });
  },
);

// ─── Delete page ──────────────────────────────────────────────────────────────

contentRoutes.delete("/content/:slug", requireAuth, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const [deleted] = await db
    .delete(contentPages)
    .where(eq(contentPages.slug, slug))
    .returning({ slug: contentPages.slug });
  if (!deleted) return fail(c, 404, "Not found");
  return ok(c, { message: "Gelöscht" });
});
