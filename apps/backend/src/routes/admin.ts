import { zValidator } from "@hono/zod-validator";
import { count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { db } from "../db/index.js";
import { adminUsers, categories, deadLinkReports, sessions, shops, submissions } from "../db/schema.js";
import { requireAuth, requireOwner, type AuthVariables } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import {
  createSession,
  deleteSession,
  findAdminByUsername,
  getAdminCount,
  hashPassword,
  verifyPassword,
} from "../services/auth.js";
import { sendSubmissionApproved, sendSubmissionRejected } from "../services/email.js";

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
  setCookie(c, "session", sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 86400,
    path: "/",
  });

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
    setCookie(c, "session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 86400,
      path: "/",
    });

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
  const [shopCount] = await db.select({ count: count() }).from(shops);
  const [categoryCount] = await db.select({ count: count() }).from(categories);
  const [pendingCount] = await db
    .select({ count: count() })
    .from(submissions)
    .where(eq(submissions.status, "pending"));
  const [totalCount] = await db.select({ count: count() }).from(submissions);

  return c.json({
    data: {
      shops: shopCount.count,
      categories: categoryCount.count,
      pendingSubmissions: pendingCount.count,
      totalSubmissions: totalCount.count,
    },
  });
});

// GET /api/admin/submissions
adminRoutes.get("/submissions", requireAuth, async (c) => {
  const status = c.req.query("status") as "pending" | "approved" | "rejected" | undefined;

  const query = db.select().from(submissions).orderBy(desc(submissions.createdAt));
  if (status) {
    const rows = await query.where(eq(submissions.status, status));
    return c.json({ data: rows });
  }

  const rows = await query;
  return c.json({ data: rows });
});

// PATCH /api/admin/submissions/:id
adminRoutes.patch(
  "/submissions/:id",
  requireAuth,
  zValidator("json", reviewSchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    const { status, adminNote, sendFeedback } = c.req.valid("json");
    const adminId = c.get("adminId");

    const [submission] = await db
      .update(submissions)
      .set({
        status,
        adminNote: adminNote ?? null,
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(submissions.id, id))
      .returning();

    if (!submission) {
      return c.json({ error: { message: "Submission not found" } }, 404);
    }

    // Email feedback
    if (sendFeedback && submission.submitterEmail) {
      if (status === "approved") {
        await sendSubmissionApproved(submission.submitterEmail, submission.shopName);
      } else {
        await sendSubmissionRejected(
          submission.submitterEmail,
          submission.shopName,
          adminNote,
        );
      }
      await db
        .update(submissions)
        .set({ feedbackSent: true })
        .where(eq(submissions.id, id));
    }

    return c.json({ data: submission });
  },
);

// CRUD Shops
adminRoutes.get("/shops", requireAuth, async (c) => {
  const rows = await db.select().from(shops).orderBy(shops.name);
  return c.json({ data: rows });
});

const shopBodySchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  categoryId: z.number().int().positive(),
  region: z.string().optional(),
  pickup: z.string().optional(),
  shipping: z.string().optional(),
  description: z.string().max(500).optional(),
});

adminRoutes.post("/shops", requireAuth, zValidator("json", shopBodySchema), async (c) => {
  const body = c.req.valid("json");
  const [shop] = await db.insert(shops).values(body).returning();
  return c.json({ data: shop }, 201);
});

const shopUpdateSchema = shopBodySchema.partial().extend({ isActive: z.boolean().optional() });

for (const method of ["put", "patch"] as const) {
  adminRoutes[method](
    "/shops/:id",
    requireAuth,
    zValidator("json", shopUpdateSchema),
    async (c) => {
      const id = Number(c.req.param("id"));
      const body = c.req.valid("json");
      const [shop] = await db
        .update(shops)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(shops.id, id))
        .returning();
      if (!shop) return c.json({ error: { message: "Shop not found" } }, 404);
      return c.json({ data: shop });
    },
  );
}

adminRoutes.delete("/shops/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(deadLinkReports).where(eq(deadLinkReports.shopId, id));
  await db.delete(shops).where(eq(shops.id, id));
  return c.json({ data: { message: "Shop deleted" } });
});

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
    .groupBy(deadLinkReports.shopId)
    .orderBy(desc(count(deadLinkReports.id)));
  return c.json({ data: rows });
});

// CRUD Categories
adminRoutes.get("/categories", requireAuth, async (c) => {
  const rows = await db.select().from(categories).orderBy(categories.name);
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
      const id = Number(c.req.param("id"));
      const body = c.req.valid("json");

      // If imageUrl is changing away from an uploaded file, delete the old file from disk
      if (body.imageUrl !== undefined) {
        const current = await db.select().from(categories).where(eq(categories.id, id)).get();
        if (current?.imageUrl?.startsWith("/uploads/") && body.imageUrl !== current.imageUrl) {
          const imagePath = process.env.IMAGE_PATH ?? "./uploads";
          const filename = current.imageUrl.replace("/uploads/", "");
          try { await Bun.file(`${imagePath}/${filename}`).delete(); } catch { /* File may not exist */ }
        }
      }

      const [category] = await db
        .update(categories)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(categories.id, id))
        .returning();
      if (!category) return c.json({ error: { message: "Category not found" } }, 404);
      return c.json({ data: category });
    },
  );
}

adminRoutes.delete("/categories/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(categories).where(eq(categories.id, id));
  return c.json({ data: { message: "Category deleted" } });
});

// Image upload for a category
adminRoutes.post("/categories/:id/image", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const cat = await db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) return c.json({ error: { message: "Category not found" } }, 404);

  const formData = await c.req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return c.json({ error: { message: "No image file provided" } }, 400);

  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return c.json({ error: { message: "Only JPEG, PNG or WebP allowed" } }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: { message: "File too large (max 5 MB)" } }, 400);

  const imagePath = process.env.IMAGE_PATH ?? "./uploads";
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${id}-${cat.slug}.${ext}`;
  const fullPath = `${imagePath}/${filename}`;

  // Delete old uploaded file if filename differs (e.g. extension changed)
  if (cat.imageUrl?.startsWith("/uploads/")) {
    const oldFilename = cat.imageUrl.replace("/uploads/", "");
    if (oldFilename !== filename) {
      try { await Bun.file(`${imagePath}/${oldFilename}`).delete(); } catch { /* File may not exist */ }
    }
  }

  await Bun.write(fullPath, await file.arrayBuffer());

  const imageUrl = `/uploads/${filename}`;
  const [updated] = await db
    .update(categories)
    .set({ imageUrl, imagePhotographer: null, imagePhotographerUrl: null, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id))
    .returning();

  return c.json({ data: updated });
});

// Delete image of a category
adminRoutes.delete("/categories/:id/image", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const cat = await db.select().from(categories).where(eq(categories.id, id)).get();
  if (!cat) return c.json({ error: { message: "Category not found" } }, 404);

  if (cat.imageUrl?.startsWith("/uploads/")) {
    const imagePath = process.env.IMAGE_PATH ?? "./uploads";
    const filename = cat.imageUrl.replace("/uploads/", "");
    try { await Bun.file(`${imagePath}/${filename}`).delete(); } catch { /* File may not exist */ }
  }

  const [updated] = await db
    .update(categories)
    .set({ imageUrl: null, imagePhotographer: null, imagePhotographerUrl: null, updatedAt: new Date().toISOString() })
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

  const json = await res.json() as { results: unknown[]; total: number };
  const results = (json.results as Array<Record<string, unknown>>).map((p) => {
    const urls = p.urls as Record<string, string>;
    const user = p.user as Record<string, unknown>;
    const links = p.links as Record<string, string>;
    const userLinks = (user.links as Record<string, string>);
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
adminRoutes.post("/unsplash/download", requireAuth, async (c) => {
  const { downloadLocation } = await c.req.json<{ downloadLocation: string }>();
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !downloadLocation) return c.json({ data: { ok: false } });
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` } }).catch(() => {});
  return c.json({ data: { ok: true } });
});

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
    return c.json(
      { data: { id: admin.id, username: admin.username, email: admin.email } },
      201,
    );
  },
);

adminRoutes.delete("/users/:id", requireAuth, requireOwner, async (c) => {
  const id = Number(c.req.param("id"));
  const adminId = c.get("adminId");

  if (id === adminId) {
    return c.json({ error: { message: "Cannot delete yourself" } }, 400);
  }

  await db.delete(sessions).where(eq(sessions.adminUserId, id));
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  return c.json({ data: { message: "User deleted" } });
});
