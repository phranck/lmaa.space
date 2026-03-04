import { zValidator } from "@hono/zod-validator";
import { contentCreateSchema, contentMetaSchema, contentUpdateSchema } from "@lmaa/contracts";
import { Hono } from "hono";
import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createManagedContentPage,
  deleteManagedContentPage,
  getManagedContentPage,
  getManagedContentPages,
  updateManagedContentPageBody,
  updateManagedContentPageMeta,
} from "../../services/admin-content.js";

/**
 * Admin content page routes (list/create/read/update/delete).
 */
export const contentRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── List all pages (without content body) ───────────────────────────────────

contentRoutes.get("/content", requireAdmin, async (c) => {
  const pages = await getManagedContentPages();
  return ok(c, pages);
});

// ─── Create page ──────────────────────────────────────────────────────────────

contentRoutes.post("/content", requireAdmin, zValidator("json", contentCreateSchema), async (c) => {
  const { slug, title, status = "draft" } = c.req.valid("json");
  const adminId = c.get("adminId");

  const result = await createManagedContentPage({ slug, title, status, adminId });
  if (!result.ok) {
    return fail(c, 409, "Slug bereits vergeben");
  }

  return ok(c, result.page, 201);
});

// ─── Get single page (with content) ──────────────────────────────────────────

contentRoutes.get("/content/:slug", requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const page = await getManagedContentPage(slug);
  if (!page) return fail(c, 404, "Not found");
  return ok(c, page);
});

// ─── Update content body ──────────────────────────────────────────────────────

contentRoutes.put(
  "/content/:slug",
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
  requireAdmin,
  zValidator("json", contentMetaSchema),
  async (c) => {
    const currentSlug = c.req.param("slug");
    const { title, slug: newSlug, status, showTitle } = c.req.valid("json");
    const adminId = c.get("adminId");

    const result = await updateManagedContentPageMeta({
      currentSlug,
      newSlug,
      title,
      status,
      showTitle,
      adminId,
    });
    if (!result.ok && result.reason === "slug_conflict")
      return fail(c, 409, "Slug bereits vergeben");
    if (!result.ok && result.reason === "not_found") return fail(c, 404, "Not found");

    return ok(c, result.page);
  },
);

// ─── Delete page ──────────────────────────────────────────────────────────────

contentRoutes.delete("/content/:slug", requireAdmin, async (c) => {
  const slug = c.req.param("slug");
  const deleted = await deleteManagedContentPage(slug);
  if (!deleted) return fail(c, 404, "Not found");
  return ok(c, { message: "Gelöscht" });
});
