import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin, requireAuth } from "../../middleware/auth.js";
import {
  createManagedContentPage,
  deleteManagedContentPage,
  getManagedContentPage,
  getManagedContentPages,
  updateManagedContentPageBody,
  updateManagedContentPageMeta,
} from "../../services/admin-content.js";

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

/**
 * Admin content page routes (list/create/read/update/delete).
 */
export const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── List all pages (without content body) ───────────────────────────────────

contentRoutes.get("/content", requireAuth, requireAdmin, async (c) => {
  const pages = await getManagedContentPages();
  return ok(c, pages);
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

    const result = await createManagedContentPage({ slug, title, status, adminId });
    if (!result.ok) {
      return fail(c, 409, "Slug bereits vergeben");
    }

    return ok(c, result.page, 201);
  },
);

// ─── Get single page (with content) ──────────────────────────────────────────

contentRoutes.get("/content/:slug", requireAuth, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const page = await getManagedContentPage(slug);
  if (!page) return fail(c, 404, "Not found");
  return ok(c, page);
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

    const updated = await updateManagedContentPageBody({ slug, content, adminId });
    if (!updated) return fail(c, 404, "Not found");

    return ok(c, updated);
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

    const result = await updateManagedContentPageMeta({
      currentSlug,
      newSlug,
      title,
      status,
      adminId,
    });
    if (!result.ok && result.reason === "slug_conflict")
      return fail(c, 409, "Slug bereits vergeben");
    if (!result.ok && result.reason === "not_found") return fail(c, 404, "Not found");

    return ok(c, result.page);
  },
);

// ─── Delete page ──────────────────────────────────────────────────────────────

contentRoutes.delete("/content/:slug", requireAuth, requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const deleted = await deleteManagedContentPage(slug);
  if (!deleted) return fail(c, 404, "Not found");
  return ok(c, { message: "Gelöscht" });
});
