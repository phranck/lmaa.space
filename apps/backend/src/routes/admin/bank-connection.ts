import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { bankConnectionCallbackSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireOwner } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  beginBankAuthorization,
  completeBankAuthorization,
  getBankConnectionStatus,
} from "../../services/bank-connection.js";
import { isEnableBankingConfigured } from "../../services/enable-banking-client.js";

/**
 * Connecting the site to the bank account whose payments it counts.
 *
 * Owner only, and deliberately not admin: this connects a bank account, which
 * is not a moderation task. A moderator or an ordinary admin has no business
 * starting it and no use for the result.
 */
export const bankConnectionRoutes = new Hono<{ Variables: AuthVariables }>();

/**
 * How large a request to these routes may be.
 *
 * The largest body either route takes is a code and a state, which is a few
 * hundred characters. The global limit is ten megabytes and exists for media
 * uploads, so it says nothing useful here.
 */
const BANK_CONNECTION_BODY_LIMIT_BYTES = 2048;

bankConnectionRoutes.use("*", requireOwner);
bankConnectionRoutes.use(
  "*",
  bodyLimit({
    maxSize: BANK_CONNECTION_BODY_LIMIT_BYTES,
    onError: (c) => fail(c, 413, "Payload too large", "PAYLOAD_TOO_LARGE"),
  }),
);

// GET /api/v1/admin/bank-connection
//
// What the dashboard shows. Answered entirely from this site's own database, so
// the page still says what it knows whilst the provider is unreachable.
bankConnectionRoutes.get("/bank-connection", async (c) => ok(c, await getBankConnectionStatus()));

// POST /api/v1/admin/bank-connection/authorize
//
// Starts an authorisation and says where to send the browser. The 503 is the
// boundary's answer to a site holding no credential, and the client refuses to
// sign without a key regardless, so neither answer depends on the other being
// remembered.
bankConnectionRoutes.post("/bank-connection/authorize", async (c) => {
  if (!isEnableBankingConfigured()) {
    return fail(c, 503, "The bank connection is not configured", "bank_not_configured");
  }
  return ok(c, await beginBankAuthorization());
});

// POST /api/v1/admin/bank-connection/session
//
// Spends the return from the bank. The code is exchanged here rather than in
// the dashboard, because the key that signs the exchange is here and nowhere
// else.
bankConnectionRoutes.post(
  "/bank-connection/session",
  validate("json", bankConnectionCallbackSchema),
  async (c) => {
    if (!isEnableBankingConfigured()) {
      return fail(c, 503, "The bank connection is not configured", "bank_not_configured");
    }
    const { code, state } = c.req.valid("json");
    return ok(c, await completeBankAuthorization(code, state));
  },
);
