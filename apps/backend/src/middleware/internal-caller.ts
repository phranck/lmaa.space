import { createMiddleware } from "hono/factory";

import { env } from "../config/env.js";
import { equalsInConstantTime } from "../lib/constant-time.js";
import { fail } from "../lib/http.js";

/** Header the website's server-side renderer uses to identify itself. */
const INTERNAL_TOKEN_HEADER = "X-Internal-Token";

/**
 * Decides whether a request comes from this project's own server-side renderer.
 *
 * @param headers - Request headers of the incoming request.
 * @returns `true` only when the request presents the configured internal token.
 *
 * @remarks
 * The website renders its pages on the server and fetches the data straight
 * from the backend rather than through the proxy, so those requests carry no
 * client address. Without a way to tell them apart they all fall into one
 * bucket, and the page rendering of the whole site is then capped by a limit
 * meant for a single visitor.
 *
 * Returns `false` whenever `INTERNAL_API_TOKEN` is unset, so a missing secret
 * closes the door instead of opening it.
 */
export function isInternalCaller(headers: Headers): boolean {
  const configured = env.INTERNAL_API_TOKEN;
  if (!configured) return false;

  const presented = headers.get(INTERNAL_TOKEN_HEADER);
  if (!presented) return false;

  return equalsInConstantTime(presented, configured);
}

/**
 * Refuses every request that does not come from this project's own renderer.
 *
 * Sits on the mount rather than on each route beneath it, so a route added to
 * the internal surface later is covered by having been put there. Answers 404
 * rather than 401, because a caller who is not the renderer has no business
 * knowing that the path exists.
 */
export const requireInternalCaller = createMiddleware(async (c, next) => {
  if (!isInternalCaller(c.req.raw.headers)) return fail(c, 404, "Not found");
  await next();
});
