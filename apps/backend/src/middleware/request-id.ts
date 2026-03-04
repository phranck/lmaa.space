import crypto from "node:crypto";
import { createMiddleware } from "hono/factory";

export const requestId = createMiddleware(async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("X-Request-ID", id);
  await next();
});
