import { existsSync } from "node:fs";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import { env } from "./config/env.js";
import { client, db } from "./db/client.js";
import { runMigrations } from "./db/run-migrations.js";
import { serveApiReference, serveOpenApiJson } from "./docs/openapi.js";
import { fail, getErrorResponse } from "./lib/http.js";
import { logger } from "./lib/logger.js";
import { startRateLimitCleanupJob } from "./middleware/rate-limit.js";
import { requestId } from "./middleware/request-id.js";
import { adminRoutes } from "./routes/admin/routes.js";
import { publicRoutes } from "./routes/public.js";
import { redirectUrlRoutes } from "./routes/redirect-urls.js";
import { securityTxtRoutes } from "./routes/security-txt.js";
import { sitemapRoutes } from "./routes/sitemap.js";
import { startReviewWorker } from "./services/review/worker.js";
import { startSessionCleanupJob } from "./services/sessions.js";
import { startReminderScheduler } from "./services/shop-reminders.js";

const DEFAULT_BODY_LIMIT_BYTES = 10 * 1024 * 1024;
const DEFAULT_BODY_LIMIT_LABEL = "10 MB";
const ADMIN_MEDIA_UPLOAD_PATH = "/api/v1/admin/media";
const ADMIN_HLS_BUNDLE_UPLOAD_PATH = "/api/v1/admin/media/bundles/hls";
const ADMIN_HLS_BUNDLE_CHUNK_UPLOAD_PATH = "/api/v1/admin/media/bundles/hls/chunks";
const FRONTEND_FONT_ASSETS_ROOT = existsSync("apps/frontend/src/assets")
  ? "apps/frontend/src/assets"
  : "../frontend/src/assets";

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
      "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
    );
    return next();
  });
}
app.use("*", (c, next) => {
  if (
    c.req.method === "POST" &&
    (c.req.path === ADMIN_MEDIA_UPLOAD_PATH ||
      c.req.path === ADMIN_HLS_BUNDLE_UPLOAD_PATH ||
      c.req.path === ADMIN_HLS_BUNDLE_CHUNK_UPLOAD_PATH)
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
app.route("/", securityTxtRoutes);
app.route("/internal", redirectUrlRoutes);
app.route("/api/v1", publicRoutes);
app.route("/api/v1/admin", adminRoutes);

app.get(
  "/fonts/*",
  serveStatic({
    root: FRONTEND_FONT_ASSETS_ROOT,
    rewriteRequestPath: (path) => path,
    onFound: (_path, c) => {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    },
  }),
);
app.get("/", (c) => c.redirect("/docs/"));
app.get("/docs", (c) => c.redirect("/docs/"));
app.get("/docs/*", serveApiReference);
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

// ── Health endpoints for the public status page (status.lmaa.space) ──────────
// Each service is probed through a consistent /health/<service> URL so the
// IPv4-only GitHub Actions monitor can reach IPv6-only Zerops services through
// the backend, which shares the dual-stack Zerops network.

/** Timeout for upstream liveness probes (ms). */
const UPSTREAM_HEALTH_TIMEOUT_MS = 5000;

/**
 * Probes an upstream URL and returns true when it answers with a non-5xx
 * status before the timeout. A 3xx redirect (followed by `fetch`) still
 * counts as up — the app is serving.
 */
async function isUpstreamReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(UPSTREAM_HEALTH_TIMEOUT_MS),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Tables whose absence would break request-time SELECTs. Every Drizzle table
 * in the schema must be listed here; add new tables when migrations add them.
 */
const EXPECTED_TABLES = [
  "admin_users",
  "app_settings",
  "categories",
  "content_pages",
  "dead_link_reports",
  "email_templates",
  "footer_config",
  "form_configs",
  "form_submissions",
  "markdown_widgets",
  "media_assets",
  "media_folders",
  "nav_items",
  "rate_limit_entries",
  "review_events",
  "review_jobs",
  "review_spend",
  "sessions",
  "shop_categories",
  "shop_concern_reports",
  "shop_geo_cities",
  "shop_geo_countries",
  "shop_geo_regions",
  "shop_headquarters",
  "shop_likes",
  "shop_reminders",
  "shops",
  "social_media_accounts",
  "social_media_post_templates",
  "submission_categories",
  "submission_headquarters",
  "submissions",
];

/**
 * Confirms the database is reachable and every hot-path table exists.
 * Catches the partially-migrated state where a deploy ships code that queries
 * tables a failed migration never created.
 *
 * @returns `{ ok: true }` when ready, else `{ ok: false, missingTables }`.
 */
async function checkDbReadiness(): Promise<{ ok: true } | { ok: false; missingTables: string[] }> {
  try {
    await db.execute(sql`SELECT 1`);
    const rows = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`,
    );
    const existing = new Set(
      (rows as unknown as { table_name: string }[]).map((r) => r.table_name),
    );
    const missing = EXPECTED_TABLES.filter((t) => !existing.has(t));
    if (missing.length > 0) return { ok: false, missingTables: missing };
    return { ok: true };
  } catch (err) {
    // The readiness response carries no detail, so the cause has to reach the
    // log or it is lost entirely.
    logger.error({ err }, "database readiness check failed");
    return { ok: false, missingTables: ["(query failed)"] };
  }
}

app.get("/health/backend", async (c) => {
  return c.json({ status: "ok" });
});

app.get("/health/db", async (c) => {
  const result = await checkDbReadiness();
  if (result.ok) return c.json({ status: "ok" });

  // The status page only needs to know whether the service is ready. Which
  // tables are missing is diagnostic detail and goes to the log, where it is
  // tied to the request id, rather than to an unauthenticated caller.
  logger.error(
    { requestId: c.get("requestId"), missingTables: result.missingTables },
    "database not ready",
  );
  c.status(503);
  return c.json({ status: "not_ready" });
});

app.get("/health/website", async (c) => {
  const url = env.FRONTEND_URL;
  if (url && (await isUpstreamReachable(url))) {
    return c.json({ status: "ok" });
  }
  c.status(503);
  return c.json({ status: "unavailable" });
});

app.get("/health/storage", async (c) => {
  const endpoint = env.S3_ENDPOINT;
  if (!endpoint) {
    c.status(503);
    return c.json({ status: "unavailable", reason: "S3 not configured" });
  }
  if (await isUpstreamReachable(endpoint)) {
    return c.json({ status: "ok" });
  }
  c.status(503);
  return c.json({ status: "unavailable" });
});

app.get("/health/dashboard", async (c) => {
  const url = env.DASHBOARD_URL;
  if (url && (await isUpstreamReachable(url))) {
    return c.json({ status: "ok" });
  }
  c.status(503);
  return c.json({ status: "unavailable" });
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
    startReminderScheduler(),
    startReviewWorker(),
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
