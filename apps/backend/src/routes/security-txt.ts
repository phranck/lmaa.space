import { existsSync, readFileSync } from "node:fs";

import { Hono } from "hono";

import { logger } from "../lib/logger.js";

/**
 * Location of the signed `security.txt` produced during deployment.
 *
 * The deployed layout keeps the workspace structure, whilst a local run starts
 * from the package directory, so both are tried in the same way the font assets
 * root in `index.ts` does.
 */
const SECURITY_TXT_PATH = existsSync("apps/backend/public/.well-known/security.txt")
  ? "apps/backend/public/.well-known/security.txt"
  : "public/.well-known/security.txt";

/**
 * Hono router serving the security contact at `/.well-known/security.txt`.
 *
 * The file is written and OpenPGP-signed by the deployment workflow rather than
 * generated here, because a signature cannot be produced at request time without
 * putting the signing key into the running service.
 *
 * RFC 9116 section 3 requires the response to carry `text/plain` with the charset
 * parameter set to `utf-8`, which is why the header is set explicitly instead of
 * being left to static file serving.
 */
export const securityTxtRoutes = new Hono();

securityTxtRoutes.get("/.well-known/security.txt", (c) => {
  try {
    const body = readFileSync(SECURITY_TXT_PATH, "utf8");
    return c.body(body, 200, { "Content-Type": "text/plain; charset=utf-8" });
  } catch (err) {
    logger.error({ err, path: SECURITY_TXT_PATH }, "security.txt is missing from the deployment");
    return c.body("", 404);
  }
});
