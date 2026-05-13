import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import { env } from "./config/env.js";
import { client, db } from "./db/index.js";
import { runMigrations } from "./db/run-migrations.js";
import { serveOpenApiJson, serveSwaggerUi } from "./docs/openapi.js";
import { fail, getErrorResponse } from "./lib/http.js";
import { logger } from "./lib/logger.js";
import { startCacheCleanupJob } from "./middleware/cache.js";
import { startRateLimitCleanupJob } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { adminRoutes } from "./routes/admin/index.js";
import { publicRoutes } from "./routes/public.js";
import { sitemapRoutes } from "./routes/sitemap.js";
import { startSessionCleanupJob } from "./services/sessions.js";
import { startReminderScheduler } from "./services/shop-reminders.js";

const DEFAULT_BODY_LIMIT_BYTES = 10 * 1024 * 1024;
const DEFAULT_BODY_LIMIT_LABEL = "10 MB";
const ADMIN_MEDIA_UPLOAD_PATH = "/api/v1/admin/media";
const ADMIN_HLS_BUNDLE_UPLOAD_PATH = "/api/v1/admin/media/bundles/hls";

const app = new Hono<{ Variables: { requestId: string } }>();

function createJsonBodyLimit(maxSize: number, maxLabel: string): MiddlewareHandler {
  return bodyLimit({
    maxSize,
    onError: (c) => fail(c, 413, `Payload too large (max ${maxLabel})`, "PAYLOAD_TOO_LARGE"),
  });
}

const defaultBodyLimit = createJsonBodyLimit(DEFAULT_BODY_LIMIT_BYTES, DEFAULT_BODY_LIMIT_LABEL);
const adminMediaBodyLimit = createJsonBodyLimit(MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL);

app.use(
  "*",
  cors({
    origin: [env.DASHBOARD_URL],
    credentials: true,
  }),
);
app.use("*", secureHeaders());
if (env.NODE_ENV === "production") {
  app.use("*", async (c, next) => {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    );
    return next();
  });
}
app.use("*", (c, next) => {
  if (
    c.req.method === "POST" &&
    (c.req.path === ADMIN_MEDIA_UPLOAD_PATH || c.req.path === ADMIN_HLS_BUNDLE_UPLOAD_PATH)
  ) {
    return adminMediaBodyLimit(c, next);
  }
  return defaultBodyLimit(c, next);
});
app.use("*", requestId);
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(
    {
      requestId: c.get("requestId"),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Date.now() - start,
    },
    "request",
  );
});

app.route("/", sitemapRoutes);
app.route("/api/v1", publicRoutes);
app.route("/api/v1/admin", adminRoutes);

app.get("/", serveSwaggerUi);
app.get("/docs", serveSwaggerUi);
app.get("/openapi.json", serveOpenApiJson);
app.get("/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok" });
  } catch {
    c.status(503);
    return c.json({ status: "degraded", reason: "database unreachable" });
  }
});

app.notFound((c) => fail(c, 404, "Not found"));
app.onError((err, c) => {
  logger.error({ err }, "unhandled error");
  const { status, error } = getErrorResponse(err);
  c.status(status);
  return c.json({ error });
});

async function startServer() {
  if (env.RUN_MIGRATIONS_ON_STARTUP) {
    await runMigrations();
  }

  const timers = [
    startSessionCleanupJob(),
    startRateLimitCleanupJob(),
    startCacheCleanupJob(),
    startReminderScheduler(),
  ];

  const port = env.PORT;
  const server = serve({ fetch: app.fetch, port });
  logger.info({ port }, "backend running");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, "shutting down gracefully");

    for (const timer of timers) clearInterval(timer);

    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info("HTTP server closed");
        resolve();
      });
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
