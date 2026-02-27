/**
 * Astro middleware for the single remaining backend passthrough endpoint.
 *
 * We intentionally do NOT proxy `/api/*` or `/uploads/*` here anymore.
 * Browser API calls must target `api.lmaa.space` directly.
 */
import { defineMiddleware } from "astro:middleware";

const DEV_DEFAULT_API_URL = "http://localhost:3000/api";

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolveBackendOrigin(): string {
  const configured = process.env.API_URL?.trim();
  const fallback = import.meta.env.DEV ? DEV_DEFAULT_API_URL : "";
  const value = configured || fallback;

  if (!value) {
    throw new Error("Missing API_URL runtime env for frontend server.");
  }

  const apiBase = normalizeApiBase(value);
  const apiUrl = new URL(apiBase);

  if (process.env.NODE_ENV === "production" && isLoopbackHost(apiUrl.hostname)) {
    throw new Error(`Invalid API_URL in production: ${apiBase}`);
  }

  return `${apiUrl.protocol}//${apiUrl.host}`;
}

const BACKEND_ORIGIN = resolveBackendOrigin();

/**
 * Astro request middleware that proxies only `/sitemap.xml` to backend.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (pathname !== "/sitemap.xml") {
    return next();
  }

  const target = new URL(`${pathname}${context.url.search}`, BACKEND_ORIGIN);
  if (target.origin === context.url.origin) {
    return new Response("Sitemap proxy misconfigured (self-referential target).", { status: 503 });
  }

  try {
    const res = await fetch(target);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch {
    return new Response("Backend unavailable", { status: 502 });
  }
});
