import pino from "pino";

import { env } from "../config/env.js";

/** Application-wide Pino logger instance. Uses pretty-print in non-production environments. */
export const logger = pino({
  level: env.LOG_LEVEL,
  // Standard serializers so that any logged `req`/`res`/`err` object is shaped
  // predictably — this is what makes the `req.headers.*` redact paths below
  // actually apply (plain pino has no req/res serializers by default).
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // Defense-in-depth: never emit credentials/session material even if an error
  // or context object happens to carry them.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.sessionId",
      "*.appPassword",
    ],
    remove: true,
  },
  ...(env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
