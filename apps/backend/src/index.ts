import fs from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env.js";
import { client } from "./db/index.js";
import { runMigrations } from "./db/run-migrations.js";
import { serveApiDocsUi, serveOpenApiJson } from "./docs/openapi.js";
import { fail, getErrorResponse } from "./lib/http.js";
import { logger } from "./lib/logger.js";
import { startCacheCleanupJob } from "./middleware/cache.js";
import { startRateLimitCleanupJob } from "./middleware/rate-limit.js";
import { adminRoutes } from "./routes/admin/index.js";
import { publicRoutes } from "./routes/public.js";
import { sitemapRoutes } from "./routes/sitemap.js";
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
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(
    { method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start },
    "request",
  );
});

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

app.route("/", sitemapRoutes);
app.route("/api/v1", publicRoutes);
app.route("/api/v1/admin", adminRoutes);

app.get("/", serveApiDocsUi);
app.get("/docs", serveApiDocsUi);
app.get("/openapi.json", serveOpenApiJson);
app.get("/health", (c) => c.json({ status: "ok" }));

app.notFound((c) => fail(c, 404, "Not found"));
app.onError((err, c) => {
  logger.error({ err }, "unhandled error");
  const { status, error } = getErrorResponse(err);
  c.status(status);
  return c.json({ error });
});

async function startServer() {
  await runMigrations();

  const timers = [startSessionCleanupJob(), startRateLimitCleanupJob(), startCacheCleanupJob()];

  const port = env.PORT;
  const server = serve({ fetch: app.fetch, port });
  logger.info({ port }, "backend running");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "shutting down gracefully");

    for (const timer of timers) clearInterval(timer);

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      await client.end({ timeout: 5 });
      logger.info("database connections closed");
    } catch (err) {
      logger.error({ err }, "error closing database");
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch((err) => {
  logger.fatal({ err }, "server startup failed");
  process.exit(1);
});
