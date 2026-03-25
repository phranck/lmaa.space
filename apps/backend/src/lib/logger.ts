import pino from "pino";

import { env } from "../config/env.js";

/** Application-wide Pino logger instance. Uses pretty-print in non-production environments. */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
