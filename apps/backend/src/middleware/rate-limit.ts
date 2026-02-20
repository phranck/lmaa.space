import { createMiddleware } from "hono/factory";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(options: { max: number; windowMs: number }) {
  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ??
      c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
      "unknown";

    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.max) {
      return c.json({ error: { message: "Too many requests" } }, 429);
    }

    entry.count++;
    return next();
  });
}
