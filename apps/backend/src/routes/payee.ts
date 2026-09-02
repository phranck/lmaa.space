import { Hono } from "hono";

import type { Payee } from "@lmaa/contracts";

import { ok } from "../lib/http.js";
import { getSponsoringConfig } from "../services/sponsors.js";

/**
 * Website-internal route for the account a transfer goes to.
 *
 * Mounted under `/internal`, where the token check refuses anybody who is not
 * this project's own renderer. The support page renders on the server, so it
 * reads the details here and puts them into the page it builds. What a visitor
 * sees is unchanged; what changed is that the details no longer travel with
 * every answer about who is carrying the costs.
 */
export const payeeRoutes = new Hono();

// GET /internal/payee – the account the support page names
payeeRoutes.get("/payee", async (c) => {
  const config = await getSponsoringConfig();

  const payload: Payee = {
    payeeName: config.payeeName,
    payeeIban: config.payeeIban,
    payeeBic: config.payeeBic,
    // The three remittance texts travel with the account rather than with the
    // public figures, because they are read in the same breath as the IBAN and
    // one fetch is what the renderer needs.
    purposeDonation: config.purposeDonation,
    purposeSponsor: config.purposeSponsor,
    purposePaypal: config.purposePaypal,
  };

  c.header("Cache-Control", "no-store");
  return ok(c, payload);
});
