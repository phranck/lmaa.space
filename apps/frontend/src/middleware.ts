/**
 * Astro middleware that proxies /api/*, /uploads/*, and /sitemap.xml
 * to the backend service. Replaces the nginx proxy_pass rules.
 */
import { defineMiddleware } from "astro:middleware";

const BACKEND = (import.meta.env.API_URL ?? "http://localhost:3000/api").replace(/\/api$/, "");

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/sitemap.xml"
  ) {
    const target = `${BACKEND}${pathname}${context.url.search}`;
    const headers = new Headers(context.request.headers);
    headers.delete("host");

    const init: RequestInit = {
      method: context.request.method,
      headers,
    };

    if (!["GET", "HEAD"].includes(context.request.method)) {
      init.body = context.request.body;
      (init as Record<string, unknown>).duplex = "half";
    }

    const res = await fetch(target, init);

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  return next();
});
