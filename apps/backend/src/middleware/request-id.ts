import crypto from "node:crypto";

import { createMiddleware } from "hono/factory";

/** Hono middleware that generates a UUID per request and sets the `X-Request-ID` response header. */
export const requestId = createMiddleware(async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("X-Request-ID", id);
  await next();
});
