/**
 * Astro middleware that can proxy /api/*, /uploads/*, and /sitemap.xml
 * to the backend service.
 *
 * Set ASTRO_API_PROXY_MODE=l7 (or off/disabled) to disable app-level proxying
 * once Zerops L7 path routing is configured.
 */
import { defineMiddleware } from "astro:middleware";

const DEV_DEFAULT_API_URL = "http://localhost:3000/api";
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

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
const ASTRO_API_PROXY_MODE = (process.env.ASTRO_API_PROXY_MODE ?? "fallback").trim().toLowerCase();
const PROXY_ENABLED = !["disabled", "off", "l7"].includes(ASTRO_API_PROXY_MODE);

function buildProxyHeaders(request: Request, requestUrl: URL): Headers {
  const headers = new Headers(request.headers);

  headers.delete("host");

  const connectionValue = headers.get("connection");
  if (connectionValue) {
    const connectionTokens = connectionValue
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    for (const token of connectionTokens) {
      headers.delete(token);
    }
  }

  for (const header of HOP_BY_HOP_HEADERS) {
    headers.delete(header);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = request.headers.get("x-real-ip");
  if (clientIp) {
    headers.set("x-forwarded-for", forwardedFor ? `${forwardedFor}, ${clientIp}` : clientIp);
  }
  headers.set("x-forwarded-host", requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

  return headers;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/sitemap.xml"
  ) {
    if (!PROXY_ENABLED) return next();

    const target = new URL(`${pathname}${context.url.search}`, BACKEND_ORIGIN);
    if (target.origin === context.url.origin) {
      return new Response("API proxy misconfigured (self-referential target).", { status: 503 });
    }

    const init: RequestInit = {
      method: context.request.method,
      headers: buildProxyHeaders(context.request, context.url),
    };

    if (!["GET", "HEAD"].includes(context.request.method)) {
      init.body = context.request.body;
      (init as Record<string, unknown>).duplex = "half";
    }

    try {
      const res = await fetch(target, init);

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch {
      return new Response("Backend unavailable", { status: 502 });
    }
  }

  return next();
});
