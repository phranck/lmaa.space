/**
 * Astro middleware that proxies backend routes through the website origin.
 *
 * Proxied prefixes:
 *   /api/v1/*  – versioned API (same-origin, avoids CORS)
 *   /uploads/* – uploaded category images
 *   /sitemap.xml – generated sitemap
 */
import type { APIContext } from "astro";
import { defineMiddleware } from "astro:middleware";

import { buildForwardedForHeader } from "./lib/client-address.js";
import { withFrameAncestors } from "./lib/csp.js";

function resolveDashboardOriginForCsp(): string {
  const explicit = process.env.DASHBOARD_URL?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return "https://dashboard.lmaa.space";
  throw new Error("Missing DASHBOARD_URL. Define it in .env.local — manually or via pewee.");
}

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolveBackendOrigin(): string {
  const value = process.env.BACKEND_URL?.trim() || process.env.API_URL?.trim();

  if (!value) {
    throw new Error(
      "Missing BACKEND_URL/API_URL. Define it in .env.local — manually or via pewee.",
    );
  }

  const apiBase = normalizeApiBase(value);
  const apiUrl = new URL(apiBase);

  if (process.env.NODE_ENV === "production" && isLoopbackHost(apiUrl.hostname)) {
    throw new Error(`Invalid BACKEND_URL/API_URL in production: ${apiBase}`);
  }

  return `${apiUrl.protocol}//${apiUrl.host}`;
}

const BACKEND_ORIGIN = resolveBackendOrigin();

function shouldProxy(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1/") ||
    pathname === "/api/v1" ||
    pathname.startsWith("/uploads/") ||
    pathname === "/sitemap.xml"
  );
}

function isEmbeddablePreviewPath(pathname: string): boolean {
  return pathname === "/preview/footer";
}

/**
 * Passes the client address on to the backend as `X-Forwarded-For`.
 *
 * @param headers - Header set being assembled for the proxied request.
 * @param context - Astro request context for the incoming request.
 *
 * @remarks
 * `context.clientAddress` is read only as the no-header fallback, never to
 * overwrite an existing header: Astro resolves it from the *first*
 * `X-Forwarded-For` entry, which is the one a caller can set freely.
 * {@link buildForwardedForHeader} documents the hop reasoning.
 */
function forwardClientAddress(headers: Headers, context: APIContext): void {
  const value = buildForwardedForHeader(
    context.request.headers.get("x-forwarded-for"),
    context.clientAddress,
  );
  if (value) headers.set("x-forwarded-for", value);
}

/**
 * Astro request middleware that proxies API, uploads and sitemap to backend.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!shouldProxy(pathname)) {
    const originalResponse = await next();
    const response = new Response(originalResponse.body, originalResponse);
    // Astro builds the policy from the configuration in `astro.config.mjs` and
    // sets it on server-rendered responses, including the hashes of every script
    // and style it processed. Only the one route meant to be framed by the
    // dashboard needs a different `frame-ancestors`.
    // Two kinds of route are meant to be framed, and both are decided here
    // because Astro writes its own policy over whatever the route set.
    const ownPolicy = context.locals.contentSecurityPolicy;
    if (ownPolicy) {
      // A widget embeds a third party and needs sources no other page does, so
      // it brings a whole policy rather than an adjustment to this one. It
      // starts from `default-src 'none'`, which makes it the stricter of the
      // two everywhere it differs.
      response.headers.set("Content-Security-Policy", ownPolicy);
      response.headers.delete("X-Frame-Options");
    } else if (isEmbeddablePreviewPath(pathname)) {
      const policy = response.headers.get("Content-Security-Policy");
      if (policy) {
        response.headers.set(
          "Content-Security-Policy",
          withFrameAncestors(policy, resolveDashboardOriginForCsp()),
        );
      }
      response.headers.delete("X-Frame-Options");
    } else if (!response.headers.has("X-Frame-Options")) {
      response.headers.set("X-Frame-Options", "DENY");
    }
    if (!response.headers.has("Referrer-Policy")) {
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    }
    if (!response.headers.has("Permissions-Policy")) {
      response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    }
    return response;
  }

  const target = new URL(`${pathname}${context.url.search}`, BACKEND_ORIGIN);
  if (target.origin === context.url.origin) {
    return new Response("Proxy misconfigured (self-referential target).", { status: 503 });
  }

  const headers = new Headers();
  const fwd = context.request.headers;
  for (const name of ["accept", "accept-language", "content-type", "cookie", "authorization"]) {
    const value = fwd.get(name);
    if (value) headers.set(name, value);
  }
  forwardClientAddress(headers, context);

  const method = context.request.method;
  const hasBody = method !== "GET" && method !== "HEAD";

  try {
    const init: RequestInit = { method, headers };
    if (hasBody) {
      init.body = context.request.body;
      // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
      init.duplex = "half";
    }
    const res = await fetch(target, init);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch {
    return new Response("Backend unavailable", { status: 502 });
  }
});
