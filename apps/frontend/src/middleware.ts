/**
 * Astro middleware that proxies backend routes through the website origin.
 *
 * Proxied prefixes:
 *   /api/v1/*  – versioned API (same-origin, avoids CORS)
 *   /uploads/* – uploaded category images
 *   /sitemap.xml – generated sitemap
 */
import { defineMiddleware } from "astro:middleware";

const WEBSITE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'self'",
  "script-src 'self' 'unsafe-inline' https://umami.layered.work https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://umami.layered.work",
  "form-action 'self'",
].join("; ");

function buildFooterPreviewCsp(): string {
  const dashboardUrl = process.env.DASHBOARD_URL?.trim();
  if (!dashboardUrl) {
    throw new Error(
      "Missing DASHBOARD_URL. Define it in .env.local — manually or via pewee.",
    );
  }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${dashboardUrl}`,
    "script-src 'self' 'unsafe-inline' https://umami.layered.work",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://umami.layered.work",
    "form-action 'self'",
  ].join("; ");
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
  const value =
    process.env.BACKEND_URL?.trim() || process.env.API_URL?.trim();

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
const FOOTER_PREVIEW_CONTENT_SECURITY_POLICY = buildFooterPreviewCsp();

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
    if (!response.headers.has("Content-Security-Policy")) {
      response.headers.set(
        "Content-Security-Policy",
        isEmbeddablePreviewPath(pathname)
          ? FOOTER_PREVIEW_CONTENT_SECURITY_POLICY
          : WEBSITE_CONTENT_SECURITY_POLICY,
      );
    }
    if (!response.headers.has("X-Frame-Options")) {
      if (isEmbeddablePreviewPath(pathname)) {
        response.headers.delete("X-Frame-Options");
      } else {
        response.headers.set("X-Frame-Options", "DENY");
      }
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
