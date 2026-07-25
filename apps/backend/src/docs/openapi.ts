import { existsSync } from "node:fs";

import { serveStatic } from "@hono/node-server/serve-static";
import type { Context, MiddlewareHandler } from "hono";

import { buildOpenApiDocument } from "./openapi-document.js";

/**
 * Directory holding the periwinkle-generated reference. Produced by
 * `npm run docs:build -w @lmaa/backend` and gitignored, so it only exists
 * after a docs build. Resolved for both working directories the server runs
 * from: the repo root in production, the workspace itself in local dev.
 */
const DOCS_ROOT = existsSync("apps/backend/docs-dist") ? "apps/backend/docs-dist" : "docs-dist";

/**
 * The generated site is fully self-contained: its stylesheet, client bundle,
 * and fonts are all same-origin, so nothing outside `'self'` is allowed.
 */
const apiReferenceContentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' https://lmaa.space https://api.lmaa.space",
  "frame-ancestors 'none'",
].join("; ");

/** Hono handler that serves the generated OpenAPI 3.1 JSON document. */
export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(buildOpenApiDocument());
}

/** True when a docs build is present and `/docs` can be served. */
export function hasBuiltApiReference(): boolean {
  return existsSync(`${DOCS_ROOT}/index.html`);
}

const staticDocs = serveStatic({
  root: DOCS_ROOT,
  rewriteRequestPath: (path) => path.replace(/^\/docs/, "") || "/",
});

/**
 * Serves the static periwinkle API reference under `/docs`.
 *
 * When no docs build is present (a fresh clone that has not run
 * `docs:build` yet), it answers with a short hint instead of a bare 404, so
 * the missing build step is obvious during local development.
 */
export const serveApiReference: MiddlewareHandler = async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!hasBuiltApiReference()) {
    return c.text("API reference not built.\n\nRun: npm run docs:build -w @lmaa/backend\n", 503);
  }
  // Both headers must be set before serveStatic builds the response: its
  // `onFound` hook runs after the body is created, so headers set there never
  // reach the client.
  c.header("Content-Security-Policy", apiReferenceContentSecurityPolicy);
  return staticDocs(c, next);
};
