/**
 * Astro middleware that proxies backend routes through the website origin.
 *
 * Proxied prefixes:
 *   /api/v1/*  – versioned API (same-origin, avoids CORS)
 *   /uploads/* – uploaded category images
 *   /sitemap.xml – generated sitemap
 */
import { defineMiddleware } from "astro:middleware";

const DEV_DEFAULT_API_URL = "http://localhost:3000/api/v1";
const WEBSITE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://umami.layered.work",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://umami.layered.work",
  "form-action 'self'",
].join("; ");
const FOOTER_PREVIEW_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors https://dashboard.lmaa.space http://localhost:5174",
  "script-src 'self' 'unsafe-inline' https://umami.layered.work",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://umami.layered.work",
  "form-action 'self'",
].join("; ");

function normalizeApiBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
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
 * Astro request middleware that proxies API, uploads and sitemap to backend.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!shouldProxy(pathname)) {
    const response = await next();
    response.headers.set(
      "Content-Security-Policy",
      isEmbeddablePreviewPath(pathname)
        ? FOOTER_PREVIEW_CONTENT_SECURITY_POLICY
        : WEBSITE_CONTENT_SECURITY_POLICY,
    );
    if (isEmbeddablePreviewPath(pathname)) {
      response.headers.delete("X-Frame-Options");
    } else {
      response.headers.set("X-Frame-Options", "DENY");
    }
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
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
