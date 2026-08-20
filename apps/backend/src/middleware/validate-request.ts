import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodSchema } from "zod";

import { fail } from "../lib/http.js";
import { logger } from "../lib/logger.js";

/** Machine-readable code every rejected request carries, whatever was wrong with it. */
export const INVALID_REQUEST_CODE = "invalid_request";

/**
 * Validates one part of a request against a schema and refuses it in the
 * project's own error shape.
 *
 * @typeParam Target - Part of the request to read: `json`, `query`, `param`, `header` or `form`.
 * @typeParam Schema - Zod schema the part has to satisfy.
 * @param target - Which part of the request to validate.
 * @param schema - Schema the part has to satisfy.
 * @returns Hono middleware that either stores the parsed value or answers 400.
 *
 * @remarks
 * Use this instead of `zValidator` directly. Called without a handler,
 * `zValidator` answers with the validation library's own error object, which
 * states the library, every expected field and every constraint. On a public
 * route that describes the request an attacker should send, and it is a second
 * error shape next to the `{ error: { message } }` one the rest of the API
 * uses.
 *
 * What was wrong with the request goes to the log, where the request id ties it
 * to the response the caller received, so a report about a refused request can
 * still be traced without publishing the schema.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends ZodSchema>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c) => {
    if (result.success) return;

    logger.info(
      { target, path: c.req.path, issues: result.error.issues },
      "request rejected by validation",
    );
    return fail(c, 400, "Invalid request", INVALID_REQUEST_CODE);
  });
}
