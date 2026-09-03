import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { bankConnectionCallbackSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin, requireOwner } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  beginBankAuthorization,
  completeBankAuthorization,
  disconnectBank,
  getBankConnectionStatus,
} from "../../services/bank-connection.js";
import { runBankIngestion } from "../../services/bank-ingestion.js";
import { isEnableBankingConfigured } from "../../services/enable-banking-client.js";

/**
 * Connecting the site to the bank account whose payments it counts.
 *
 * Split by what a request does rather than by path. Reading the state is a
 * status anybody keeping the books may see, whilst everything that acts reaches
 * a bank account and belongs to the owner alone. That check sits on the mount
 * below rather than on each route, so one added there later is covered by
 * having been put there.
 */
export const bankConnectionRoutes = new Hono<{ Variables: AuthVariables }>();

/**
 * How large a request to these routes may be.
 *
 * The largest body any of them takes is a code and a state, which is a few
 * hundred characters. The global limit is ten megabytes and exists for media
 * uploads, so it says nothing useful here.
 */
const BANK_CONNECTION_BODY_LIMIT_BYTES = 2048;

// GET /api/v1/admin/bank-connection
//
// What the dashboard shows. Answered entirely from this site's own database, so
// the page still says what it knows whilst the provider is unreachable. It
// carries neither the session nor the whole account identifier.
bankConnectionRoutes.get("/bank-connection", requireAdmin, async (c) =>
  ok(c, await getBankConnectionStatus()),
);

const actingRoutes = new Hono<{ Variables: AuthVariables }>();
actingRoutes.use("*", requireOwner);
actingRoutes.use(
  "*",
  bodyLimit({
    maxSize: BANK_CONNECTION_BODY_LIMIT_BYTES,
    onError: (c) => fail(c, 413, "Payload too large", "PAYLOAD_TOO_LARGE"),
  }),
);

// POST /api/v1/admin/bank-connection/authorize
//
// Starts an authorisation and says where to send the browser. The 503 is the
// boundary's answer to a site holding no credential, and the client refuses to
// sign without a key regardless, so neither answer depends on the other being
// remembered.
actingRoutes.post("/bank-connection/authorize", async (c) => {
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
actingRoutes.post(
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

// DELETE /api/v1/admin/bank-connection
//
// Lets the account go. Takes no identifier, so there is nothing that could
// point at a connection other than the one in force. The 503 stands here too,
// because closing the session at the bank needs the same credential as opening
// it did.
actingRoutes.delete("/bank-connection", async (c) => {
  if (!isEnableBankingConfigured()) {
    return fail(c, 503, "The bank connection is not configured", "bank_not_configured");
  }
  return ok(c, await disconnectBank());
});

// POST /api/v1/admin/bank-connection/sync
//
// Reads the account now rather than waiting for the next background run. This
// is the account holder asking for their own information, which Article 36(5)(a)
// of Commission Delegated Regulation (EU) 2018/389 does not cap, so it draws on
// a budget of its own and cannot lock the automatic run out.
actingRoutes.post("/bank-connection/sync", async (c) => {
  if (!isEnableBankingConfigured()) {
    return fail(c, 503, "The bank connection is not configured", "bank_not_configured");
  }
  return ok(c, await runBankIngestion("manual"));
});

// Mounted last, so every acting route above is behind the owner check.
bankConnectionRoutes.route("/", actingRoutes);
