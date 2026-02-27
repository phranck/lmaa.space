import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { categories } from "./db/schema.js";
import { serveApiDocsUi, serveOpenApiJson } from "./docs/openapi.js";
import { fail, getErrorResponse } from "./lib/http.js";
import { adminRoutes } from "./routes/admin/index.js";
import { publicRoutes } from "./routes/public.js";
import { startSessionCleanupJob } from "./services/sessions.js";

const app = new Hono();
const imagePath = env.IMAGE_PATH;

const allowedOrigins =
  env.NODE_ENV === "production"
    ? ["https://lmaa.space", "https://www.lmaa.space", "https://dashboard.lmaa.space"]
    : ["http://localhost:5173", "http://localhost:5174"];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use("*", secureHeaders());
app.use("*", logger());

// Serve uploaded category images
app.get("/uploads/:filename{[^/]+}", async (c) => {
  const filename = c.req.param("filename");
  if (filename.includes("..")) return fail(c, 404, "Not found");
  const filepath = path.join(imagePath, filename);
  try {
    const data = await fs.promises.readFile(filepath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": contentType } });
  } catch {
    return fail(c, 404, "Not found");
  }
});

// Sitemap (proxied via nginx: location = /sitemap.xml { proxy_pass http://backend:3000; })
app.get("/sitemap.xml", async (c) => {
  try {
    const cats = await db
      .select({ slug: categories.slug, updatedAt: categories.updatedAt })
      .from(categories)
      .orderBy(categories.sortOrder);

    const BASE = "https://lmaa.space";
    const today = new Date().toISOString().split("T")[0];

    const staticUrls = [
      { loc: `${BASE}/`, changefreq: "daily", priority: "1.0", lastmod: today },
      { loc: `${BASE}/suche`, changefreq: "weekly", priority: "0.5", lastmod: today },
      { loc: `${BASE}/vorschlagen`, changefreq: "monthly", priority: "0.4", lastmod: today },
      { loc: `${BASE}/ueber-uns`, changefreq: "monthly", priority: "0.3", lastmod: today },
      { loc: `${BASE}/impressum`, changefreq: "yearly", priority: "0.1", lastmod: today },
      { loc: `${BASE}/datenschutz`, changefreq: "yearly", priority: "0.1", lastmod: today },
    ];

    const categoryUrls = cats.map((cat) => ({
      loc: `${BASE}/kategorie/${cat.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: new Date(cat.updatedAt).toISOString().split("T")[0],
    }));

    const entries = [...staticUrls, ...categoryUrls]
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;

    return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    return c.body("", 500);
  }
});

app.route("/api", publicRoutes);
app.route("/api/admin", adminRoutes);

app.get("/", serveApiDocsUi);
app.get("/docs", serveApiDocsUi);
app.get("/openapi.json", serveOpenApiJson);
app.get("/health", (c) => c.json({ status: "ok" }));

app.notFound((c) => fail(c, 404, "Not found"));
app.onError((err, c) => {
  console.error("[error]", err);
  const { status, error } = getErrorResponse(err);
  c.status(status);
  return c.json({ error });
});

// Start background jobs
startSessionCleanupJob();

const port = env.PORT;
console.log(`Backend running on port ${port}`);

serve({ fetch: app.fetch, port });
// lmaa.space
