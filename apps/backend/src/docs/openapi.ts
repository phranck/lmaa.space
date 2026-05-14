import { Scalar } from "@scalar/hono-api-reference";
import type { Context, MiddlewareHandler } from "hono";

import { buildOpenApiDocument } from "./openapi-document.js";

const scalarApiReference = Scalar({
  url: "/openapi.json",
  pageTitle: "LMAA Public API",
  layout: "modern",
  theme: "moon",
  darkMode: true,
  forceDarkModeState: "dark",
  hideDarkModeToggle: true,
  defaultHttpClient: {
    targetKey: "shell",
    clientKey: "curl",
  },
});

const apiReferenceContentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self' https://lmaa.space",
  "frame-ancestors 'none'",
].join("; ");

/** Hono handler that serves the generated OpenAPI 3.1 JSON document. */
export function serveOpenApiJson(c: Context) {
  c.header("Cache-Control", "no-store");
  return c.json(buildOpenApiDocument());
}

/** Hono handler that serves the Scalar API Reference for the generated OpenAPI document. */
export const serveApiReference: MiddlewareHandler = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("Content-Security-Policy", apiReferenceContentSecurityPolicy);
  return scalarApiReference(c, next);
};
