import { Hono } from "hono";
import { z } from "zod";

import { donationInputSchema, donationRangeSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deleteDonation,
  getDonation,
  insertDonation,
  listDonations,
  sumDonations,
  updateDonation,
} from "../../repositories/donations.js";
import { getDonationBreakdown, getDonationTotals } from "../../services/donations.js";

/**
 * Managing the ledger of what came in, whatever route it took.
 *
 * Admin only, as the sponsor routes are. An amount is what somebody gave, and
 * the public routes deliberately serve none of them.
 */
export const donationRoutes = new Hono<{ Variables: AuthVariables }>();

donationRoutes.use("*", requireAdmin);

const donationIdSchema = z.object({ id: z.string().uuid() });

/** The day the rolling windows count back from. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/admin/donations?from=&to= — the ledger, most recent first
//
// The same range that filters the list also produces the sum below it, so the
// page never shows a total for one window beside rows from another.
donationRoutes.get("/donations", validate("query", donationRangeSchema), async (c) => {
  const range = c.req.valid("query");
  const [rows, sum] = await Promise.all([listDonations(range), sumDonations(range)]);
  return ok(c, { donations: rows, rangeCents: sum.cents, rangeCount: sum.count });
});

// GET /api/admin/donations/totals — the month and the year at a glance
donationRoutes.get("/donations/totals", async (c) => ok(c, await getDonationTotals(today())));

// GET /api/admin/donations/breakdown?from=&to= — the ledger grouped, for a chart
//
// Takes the same window as the list above and no period size. How wide a period
// is follows from that window, so one request cannot ask for daily figures
// across a decade and decide the length of the answer for itself.
donationRoutes.get("/donations/breakdown", validate("query", donationRangeSchema), async (c) =>
  ok(c, await getDonationBreakdown(c.req.valid("query"), today())),
);

// POST /api/admin/donations
donationRoutes.post("/donations", validate("json", donationInputSchema), async (c) =>
  ok(c, await insertDonation(c.req.valid("json"))),
);

// GET /api/admin/donations/:id
donationRoutes.get("/donations/:id", validate("param", donationIdSchema), async (c) => {
  const donation = await getDonation(c.req.valid("param").id);
  if (!donation) return fail(c, 404, "Not found");
  return ok(c, donation);
});

// PUT /api/admin/donations/:id
donationRoutes.put(
  "/donations/:id",
  validate("param", donationIdSchema),
  validate("json", donationInputSchema),
  async (c) => {
    const updated = await updateDonation(c.req.valid("param").id, c.req.valid("json"));
    if (!updated) return fail(c, 404, "Not found");
    return ok(c, updated);
  },
);

// DELETE /api/admin/donations/:id
donationRoutes.delete("/donations/:id", validate("param", donationIdSchema), async (c) => {
  const removed = await deleteDonation(c.req.valid("param").id);
  if (!removed) return fail(c, 404, "Not found");
  return ok(c, { message: "Donation deleted" });
});
