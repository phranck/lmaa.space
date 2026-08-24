import pino from "pino";
import PinoPretty from "pino-pretty";

import { env } from "../config/env.js";

/**
 * Shared Pino options applied in every environment (level, serializers,
 * redaction). Held separately from the output destination so the pretty-print
 * stream can be attached conditionally without duplicating this configuration.
 */
const options: pino.LoggerOptions = {
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
      // A creditor reference addresses a pending sponsorship and is sized
      // against being guessed, so it is credential material rather than an
      // identifier and never belongs in a log line.
      "*.reference",
    ],
    remove: true,
  },
};

/**
 * Application-wide Pino logger instance.
 *
 * In non-production environments the output is piped through `pino-pretty` as a
 * direct destination stream instead of Pino's worker-thread transport
 * (`transport: { target: "pino-pretty" }`). That transport relies on
 * `thread-stream`, which crashes on Node.js 26 with
 * `Error: this should not happen: undefined` and prevents the backend from
 * booting at all. Attaching pino-pretty synchronously as a stream avoids
 * `thread-stream` entirely while producing identical colorized dev output.
 * Production keeps the default structured JSON on stdout.
 */
export const logger =
  env.NODE_ENV !== "production" ? pino(options, PinoPretty({ colorize: true })) : pino(options);
