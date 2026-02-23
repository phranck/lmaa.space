import fs from "node:fs";
import { zValidator } from "@hono/zod-validator";
import { count, desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  adminUsers,
  categories,
  contentPages,
  deadLinkReports,
  sessions,
  shopCategories,
  shops,
  submissionCategories,
  submissions,
} from "../db/schema.js";
import { extractHomepage, fetchPreviewImage } from "../lib/og.js";
import { detectImageType, parseId } from "../lib/validate.js";
import { type AuthVariables, requireAuth, requireOwner } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  SESSION_COOKIE_OPTIONS,
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
  hashPassword,
  verifyPassword,
} from "../services/auth.js";
import { sendSubmissionApproved, sendSubmissionRejected } from "../services/email.js";
import {
  UMAMI_WEBSITE_ID,
  type UmamiPeriod,
  periodToRange,
  umamiConfigured,
  umamiGet,
} from "../services/umami.js";

const setupSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const reviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().max(500).optional(),
  sendFeedback: z.boolean().optional(),
});

export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/admin/setup – check if initial setup is needed
adminRoutes.get("/setup", async (c) => {
  const count = await getAdminCount();
  return c.json({ needsSetup: count === 0 });
});

// POST /api/admin/setup (only if no admin exists)
adminRoutes.post("/setup", zValidator("json", setupSchema), async (c) => {
  const adminCount = await getAdminCount();
  if (adminCount > 0) {
    return c.json({ error: { message: "Setup already completed" } }, 403);
  }

  const { username, email, password } = c.req.valid("json");
  const passwordHash = await hashPassword(password);

  const [admin] = await db
    .insert(adminUsers)
    .values({ username, email, passwordHash, isOwner: true })
    .returning();

  const sessionId = await createSession(admin.id);
  setCookie(c, "session", sessionId, SESSION_COOKIE_OPTIONS);

  return c.json({ data: { id: admin.id, username: admin.username, isOwner: true } }, 201);
});

// POST /api/admin/login
adminRoutes.post(
  "/login",
  rateLimit({ max: 10, windowMs: 15 * 60 * 1000 }),
  zValidator("json", loginSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    const admin = await findAdminByUsername(username);

    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      return c.json({ error: { message: "Invalid credentials" } }, 401);
    }

    const sessionId = await createSession(admin.id);
    setCookie(c, "session", sessionId, SESSION_COOKIE_OPTIONS);

    return c.json({
      data: { id: admin.id, username: admin.username, isOwner: admin.isOwner },
    });
  },
);

// POST /api/admin/logout
adminRoutes.post("/logout", requireAuth, async (c) => {
  const sessionId = getCookie(c, "session");
  if (sessionId) await deleteSession(sessionId);
  deleteCookie(c, "session", { path: "/" });
  return c.json({ data: { message: "Logged out" } });
});

// GET /api/admin/me
adminRoutes.get("/me", requireAuth, async (c) => {
  const adminId = c.get("adminId");
  const [admin] = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      isOwner: adminUsers.isOwner,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  return c.json({ data: admin });
});

// GET /api/admin/stats
adminRoutes.get("/stats", requireAuth, async (c) => {
  const [stats] = await db.execute<{
    shops: number;
    categories: number;
    pendingSubmissions: number;
    totalSubmissions: number;
    deadLinkReports: number;
  }>(sql`
    SELECT
      (SELECT count(*)::int FROM shops) AS shops,
      (SELECT count(*)::int FROM categories) AS categories,
      (SELECT count(*)::int FROM submissions WHERE status = 'pending') AS "pendingSubmissions",
      (SELECT count(*)::int FROM submissions) AS "totalSubmissions",
      (SELECT count(DISTINCT shop_id)::int FROM dead_link_reports) AS "deadLinkReports"
  `);
  return c.json({ data: stats });
});

// GET /api/admin/umami/stats?period=today|7d|30d
adminRoutes.get("/umami/stats", requireAuth, async (c) => {
  if (!umamiConfigured) return c.json({ data: null });
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const { startAt, endAt } = periodToRange(period);
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`,
    );
    return c.json({ data });
  } catch {
    return c.json({ data: null });
  }
});

// GET /api/admin/umami/pageviews?period=today|7d|30d
adminRoutes.get("/umami/pageviews", requireAuth, async (c) => {
  if (!umamiConfigured) return c.json({ data: null });
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const { startAt, endAt } = periodToRange(period);
  const unit = period === "today" ? "hour" : "day";
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=${unit}`,
    );
    return c.json({ data });
  } catch {
    return c.json({ data: null });
  }
});

// GET /api/admin/umami/metrics?type=url|country|referrer&period=today|7d|30d
adminRoutes.get("/umami/metrics", requireAuth, async (c) => {
  if (!umamiConfigured) return c.json({ data: null });
  const period = (c.req.query("period") ?? "7d") as UmamiPeriod;
  const type = c.req.query("type") ?? "url";
  const { startAt, endAt } = periodToRange(period);
  try {
    const data = await umamiGet(
      `/websites/${UMAMI_WEBSITE_ID}/metrics?type=${type}&startAt=${startAt}&endAt=${endAt}&limit=10`,
    );
    return c.json({ data });
  } catch {
    return c.json({ data: null });
  }
});

// GET /api/admin/umami/active – visitors in the last 5 minutes
adminRoutes.get("/umami/active", requireAuth, async (c) => {
  if (!umamiConfigured) return c.json({ data: null });
  try {
    const data = await umamiGet(`/websites/${UMAMI_WEBSITE_ID}/active`);
    return c.json({ data });
  } catch {
    return c.json({ data: null });
  }
});

// GET /api/admin/umami/realtime – last 30 minutes
adminRoutes.get("/umami/realtime", requireAuth, async (c) => {
  if (!umamiConfigured) return c.json({ data: null });
  try {
    const data = await umamiGet(`/realtime/${UMAMI_WEBSITE_ID}`);
    return c.json({ data });
  } catch {
    return c.json({ data: null });
  }
});

// GET /api/admin/submissions
adminRoutes.get("/submissions", requireAuth, async (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;

  const query = db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const rows = status ? await query.where(eq(submissions.status, status)) : await query;

  const subIds = rows.map((s) => s.id);
  const catRows =
    subIds.length > 0
      ? await db
          .select()
          .from(submissionCategories)
          .where(inArray(submissionCategories.submissionId, subIds))
      : [];

  const catMap = new Map<number, number[]>();
  for (const r of catRows) {
    const arr = catMap.get(r.submissionId) ?? [];
    arr.push(r.categoryId);
    catMap.set(r.submissionId, arr);
  }

  const mapped = rows.map((row) => ({ ...row, categoryIds: catMap.get(row.id) ?? [] }));
  return c.json({ data: mapped });
});

// PATCH /api/admin/submissions/:id
adminRoutes.patch("/submissions/:id", requireAuth, zValidator("json", reviewSchema), async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const { status, adminNote, sendFeedback } = c.req.valid("json");
  const adminId = c.get("adminId");

  const { submission, newShop } = await db.transaction(async (tx) => {
    const [sub] = await tx
      .update(submissions)
      .set({
        status,
        adminNote: adminNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, id))
      .returning();

    if (!sub) return { submission: null, newShop: null };

    let created = null;
    if (status === "approved") {
      const catRows = await tx
        .select({ categoryId: submissionCategories.categoryId })
        .from(submissionCategories)
        .where(eq(submissionCategories.submissionId, id));

      const [shop] = await tx
        .insert(shops)
        .values({
          name: sub.shopName,
          url: sub.shopUrl,
          region: sub.region,
          pickup: sub.pickup,
          shipping: sub.shipping,
          description: sub.description,
        })
        .returning();

      if (catRows.length > 0) {
        await tx
          .insert(shopCategories)
          .values(catRows.map((r) => ({ shopId: shop.id, categoryId: r.categoryId })));
      }
      created = shop;
    }

    return { submission: sub, newShop: created };
  });

  if (!submission) {
    return c.json({ error: { message: "Submission not found" } }, 404);
  }

  // Side effects outside transaction
  if (newShop) {
    fetchPreviewImage(newShop.url)
      .then(async (result) => {
        if (result) {
          await db.update(shops).set({ ogImage: result.url }).where(eq(shops.id, newShop.id));
        }
      })
      .catch(() => {});
  }

  if (sendFeedback && submission.submitterEmail) {
    try {
      if (status === "approved") {
        await sendSubmissionApproved(submission.submitterEmail, submission.shopName);
      } else {
        await sendSubmissionRejected(submission.submitterEmail, submission.shopName, adminNote);
      }
      await db.update(submissions).set({ feedbackSent: true }).where(eq(submissions.id, id));
    } catch (err) {
      console.error("[email] Failed to send feedback:", err);
    }
  }

  return c.json({ data: submission });
});

// PATCH /api/admin/submissions/:id/edit – update pending submission's shop data
const submissionEditSchema = z.object({
  shopName: z.string().min(1).max(200),
  shopUrl: z.string().url(),
  description: z.string().max(2000).optional(),
  region: z
    .array(z.enum(["DE", "AT", "CH", "EU"]))
    .optional()
    .default([]),
  shipping: z.string().max(200).optional(),
  categoryIds: z.array(z.number().int().positive()),
});

adminRoutes.patch(
  "/submissions/:id/edit",
  requireAuth,
  zValidator("json", submissionEditSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
    const body = c.req.valid("json");

    const submission = await db.transaction(async (tx) => {
      const [sub] = await tx
        .update(submissions)
        .set({
          shopName: body.shopName,
          shopUrl: body.shopUrl,
          description: body.description ?? "",
          region: body.region ?? [],
          shipping: body.shipping ?? "",
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, id))
        .returning();

      if (!sub) return null;

      await tx.delete(submissionCategories).where(eq(submissionCategories.submissionId, id));

      if (body.categoryIds.length > 0) {
        await tx
          .insert(submissionCategories)
          .values(body.categoryIds.map((cid) => ({ submissionId: id, categoryId: cid })));
      }

      return sub;
    });

    if (!submission) {
      return c.json({ error: { message: "Submission not found" } }, 404);
    }

    return c.json({ data: submission });
  },
);

// ── Shops ──────────────────────────────────────────────────────────────────────

adminRoutes.get("/shops", requireAuth, async (c) => {
  const rows = await db.execute(sql`
    SELECT s.id, s.name, s.url, s.region,
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    GROUP BY s.id
    ORDER BY s.name
  `);
  return c.json({ data: rows });
});

adminRoutes.get("/shops/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const [row] = await db.execute(sql`
    SELECT s.id, s.name, s.url, s.region, s.pickup, s.shipping, s.description,
           s.og_image as "ogImage", s.is_active as "isActive",
           s.created_at as "createdAt", s.updated_at as "updatedAt",
           COALESCE(
             json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name))
             FILTER (WHERE c.id IS NOT NULL),
             '[]'::json
           ) as categories
    FROM shops s
    LEFT JOIN shop_categories sc ON sc.shop_id = s.id
    LEFT JOIN categories c ON c.id = sc.category_id
    WHERE s.id = ${id}
    GROUP BY s.id
  `);
  if (!row) return c.json({ error: { message: "Shop not found" } }, 404);
  return c.json({ data: row });
});

const shopBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  region: z
    .array(z.enum(["DE", "AT", "CH", "EU"]))
    .optional()
    .default([]),
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(2000).optional(),
});

adminRoutes.post("/shops", requireAuth, zValidator("json", shopBodySchema), async (c) => {
  const { categoryIds, ...shopData } = c.req.valid("json");

  const shop = await db.transaction(async (tx) => {
    const [s] = await tx.insert(shops).values(shopData).returning();
    if (categoryIds.length > 0) {
      await tx
        .insert(shopCategories)
        .values(categoryIds.map((cid) => ({ shopId: s.id, categoryId: cid })));
    }
    return s;
  });

  fetchPreviewImage(shop.url)
    .then(async (result) => {
      if (result) {
        await db.update(shops).set({ ogImage: result.url }).where(eq(shops.id, shop.id));
      }
    })
    .catch(() => {});

  return c.json({ data: { ...shop, categories: [] } }, 201);
});

const shopUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  region: z.array(z.enum(["DE", "AT", "CH", "EU"])).optional(),
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

for (const method of ["put", "patch"] as const) {
  adminRoutes[method](
    "/shops/:id",
    requireAuth,
    zValidator("json", shopUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
      const { categoryIds, ...shopData } = c.req.valid("json");

      const shop = await db.transaction(async (tx) => {
        const [s] = await tx
          .update(shops)
          .set({ ...shopData, updatedAt: new Date() })
          .where(eq(shops.id, id))
          .returning();
        if (!s) return null;

        if (categoryIds !== undefined) {
          await tx.delete(shopCategories).where(eq(shopCategories.shopId, id));
          if (categoryIds.length > 0) {
            await tx
              .insert(shopCategories)
              .values(categoryIds.map((cid) => ({ shopId: id, categoryId: cid })));
          }
        }

        return s;
      });

      if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);
      return c.json({ data: { ...shop, categories: [] } });
    },
  );
}

adminRoutes.delete("/shops/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  await db.transaction(async (tx) => {
    await tx.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
    await tx.delete(shops).where(eq(shops.id, id));
  });
  return c.json({ data: { message: "Shop deleted" } });
});

adminRoutes.post("/shops/:id/refetch-image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);

  const [shop] = await db.select({ url: shops.url }).from(shops).where(eq(shops.id, id));
  if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);

  const result = await fetchPreviewImage(extractHomepage(shop.url));
  const ogImage = result?.url ?? null;
  await db.update(shops).set({ ogImage }).where(eq(shops.id, id));

  return c.json({ data: { ogImage } });
});

const previewImageSchema = z.object({ url: z.string().url() });

adminRoutes.post(
  "/preview-image",
  requireAuth,
  zValidator("json", previewImageSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const result = await fetchPreviewImage(extractHomepage(url));
    return c.json({ data: { ogImage: result?.url ?? null } });
  },
);

// GET /api/admin/dead-link-reports
adminRoutes.get("/dead-link-reports", requireAuth, async (c) => {
  const rows = await db
    .select({
      shopId: deadLinkReports.shopId,
      shopName: shops.name,
      shopUrl: shops.url,
      reportCount: count(deadLinkReports.id),
    })
    .from(deadLinkReports)
    .innerJoin(shops, eq(deadLinkReports.shopId, shops.id))
    .groupBy(deadLinkReports.shopId, shops.name, shops.url)
    .orderBy(desc(count(deadLinkReports.id)));
  return c.json({ data: rows });
});

// DELETE /api/admin/dead-link-reports/:shopId – clear all reports for a shop
adminRoutes.delete("/dead-link-reports/:shopId", requireAuth, async (c) => {
  const shopId = parseId(c.req.param("shopId"));
  if (!shopId) return c.json({ error: { message: "Invalid shop id" } }, 400);
  await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, shopId));
  return c.json({ data: { message: "Reports cleared" } });
});

// ── Categories ─────────────────────────────────────────────────────────────────

adminRoutes.get("/categories", requireAuth, async (c) => {
  const rows = await db
    .select({ ...getTableColumns(categories), shopCount: count(shops.id) })
    .from(categories)
    .leftJoin(shopCategories, eq(shopCategories.categoryId, categories.id))
    .leftJoin(shops, eq(shops.id, shopCategories.shopId))
    .groupBy(categories.id)
    .orderBy(categories.name);
  return c.json({ data: rows });
});

const categoryBodySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
  imageUrl: z.string().url().nullable().optional(),
  imagePhotographer: z.string().max(200).nullable().optional(),
  imagePhotographerUrl: z.string().url().nullable().optional(),
});

adminRoutes.post("/categories", requireAuth, zValidator("json", categoryBodySchema), async (c) => {
  const body = c.req.valid("json");
  const [category] = await db.insert(categories).values(body).returning();
  return c.json({ data: category }, 201);
});

const categoryUpdateSchema = categoryBodySchema.partial();

for (const method of ["put", "patch"] as const) {
  adminRoutes[method](
    "/categories/:id",
    requireAuth,
    zValidator("json", categoryUpdateSchema),
    async (c) => {
      const id = parseId(c.req.param("id"));
      if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
      const body = c.req.valid("json");

      // If imageUrl is changing away from an uploaded file, delete the old file from disk
      if (body.imageUrl !== undefined) {
        const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
        if (current?.imageUrl?.startsWith("/uploads/") && body.imageUrl !== current.imageUrl) {
          const imagePath = process.env.IMAGE_PATH ?? "./uploads";
          const filename = current.imageUrl.replace("/uploads/", "");
          try {
            await fs.promises.unlink(`${imagePath}/${filename}`);
          } catch {
            /* File may not exist */
          }
        }
      }

      const [category] = await db
        .update(categories)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();
      if (!category) return c.json({ error: { message: "Category not found" } }, 404);
      return c.json({ data: category });
    },
  );
}

adminRoutes.delete("/categories/:id", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ data: { message: "Category deleted" } });
});

// Image upload for a category
adminRoutes.post("/categories/:id/image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return c.json({ error: { message: "Category not found" } }, 404);

  const formData = await c.req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return c.json({ error: { message: "No image file provided" } }, 400);

  if (file.size > 5 * 1024 * 1024)
    return c.json({ error: { message: "File too large (max 5 MB)" } }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = detectImageType(buffer);
  if (!detectedType)
    return c.json({ error: { message: "Invalid image content (only JPEG, PNG or WebP)" } }, 400);

  const imagePath = process.env.IMAGE_PATH ?? "./uploads";
  const ext = detectedType === "png" ? "png" : detectedType === "webp" ? "webp" : "jpg";
  const filename = `${id}-${cat.slug}.${ext}`;
  const fullPath = `${imagePath}/${filename}`;

  // Delete old uploaded file if filename differs (e.g. extension changed)
  if (cat.imageUrl?.startsWith("/uploads/")) {
    const oldFilename = cat.imageUrl.replace("/uploads/", "");
    if (oldFilename !== filename) {
      try {
        await fs.promises.unlink(`${imagePath}/${oldFilename}`);
      } catch {
        /* File may not exist */
      }
    }
  }

  await fs.promises.mkdir(imagePath, { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);

  const imageUrl = `/uploads/${filename}`;
  const [updated] = await db
    .update(categories)
    .set({ imageUrl, imagePhotographer: null, imagePhotographerUrl: null, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();

  return c.json({ data: updated });
});

// Delete image of a category
adminRoutes.delete("/categories/:id/image", requireAuth, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return c.json({ error: { message: "Category not found" } }, 404);

  if (cat.imageUrl?.startsWith("/uploads/")) {
    const imagePath = process.env.IMAGE_PATH ?? "./uploads";
    const filename = cat.imageUrl.replace("/uploads/", "");
    try {
      await fs.promises.unlink(`${imagePath}/${filename}`);
    } catch {
      /* File may not exist */
    }
  }

  const [updated] = await db
    .update(categories)
    .set({
      imageUrl: null,
      imagePhotographer: null,
      imagePhotographerUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return c.json({ data: updated });
});

// Unsplash proxy: search
adminRoutes.get("/unsplash/search", requireAuth, async (c) => {
  const q = c.req.query("q") ?? "";
  const page = c.req.query("page") ?? "1";
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return c.json({ error: { message: "Unsplash not configured" } }, 503);
  if (!q) return c.json({ data: { results: [], total: 0 } });

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=30&page=${page}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) return c.json({ error: { message: "Unsplash request failed" } }, 502);

  const json = (await res.json()) as { results: unknown[]; total: number };
  const results = (json.results as Array<Record<string, unknown>>).map((p) => {
    const urls = p.urls as Record<string, string>;
    const user = p.user as Record<string, unknown>;
    const links = p.links as Record<string, string>;
    const userLinks = user.links as Record<string, string>;
    return {
      id: p.id,
      urls: { small: urls.small, regular: urls.regular },
      user: { name: user.name, link: userLinks.html },
      downloadLocation: links.download_location,
    };
  });
  return c.json({ data: { results, total: json.total } });
});

// Unsplash ToS: trigger download
const unsplashDownloadSchema = z.object({
  downloadLocation: z
    .string()
    .url()
    .refine(
      (u) => u.startsWith("https://api.unsplash.com/"),
      "Download URL must be an Unsplash API URL",
    ),
});

adminRoutes.post(
  "/unsplash/download",
  requireAuth,
  zValidator("json", unsplashDownloadSchema),
  async (c) => {
    const { downloadLocation } = c.req.valid("json");
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return c.json({ data: { ok: false } });
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(
      () => {},
    );
    return c.json({ data: { ok: true } });
  },
);

// Content pages management
adminRoutes.get("/content/:slug", requireAuth, async (c) => {
  const slug = c.req.param("slug");
  const [page] = await db.select().from(contentPages).where(eq(contentPages.slug, slug)).limit(1);
  if (!page) return c.json({ error: { message: "Not found" } }, 404);
  return c.json({ data: page });
});

const contentUpdateSchema = z.object({
  content: z.string().max(100_000),
});

adminRoutes.put(
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

// Admin user management (owner only)
adminRoutes.get("/users", requireAuth, requireOwner, async (c) => {
  const users = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      isOwner: adminUsers.isOwner,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers);
  return c.json({ data: users });
});

adminRoutes.post(
  "/users",
  requireAuth,
  requireOwner,
  zValidator("json", setupSchema),
  async (c) => {
    const { username, email, password } = c.req.valid("json");
    const passwordHash = await hashPassword(password);
    const [admin] = await db
      .insert(adminUsers)
      .values({ username, email, passwordHash })
      .returning();
    return c.json({ data: { id: admin.id, username: admin.username, email: admin.email } }, 201);
  },
);

adminRoutes.delete("/users/:id", requireAuth, requireOwner, async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: { message: "Invalid id" } }, 400);
  const adminId = c.get("adminId");

  if (id === adminId) {
    return c.json({ error: { message: "Cannot delete yourself" } }, 400);
  }

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.adminUserId, id));
    await tx.delete(adminUsers).where(eq(adminUsers.id, id));
  });
  return c.json({ data: { message: "User deleted" } });
});
