import { Hono } from "hono";
import { z } from "zod";

import { pendingSponsorshipTakeoverSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deletePendingSponsorship,
  listPendingSponsorships,
} from "../../repositories/pending-sponsorships.js";
import { takeOverPendingSponsorship } from "../../services/pending-sponsorships.js";

/**
 * The announcements that have not yet become sponsors.
 *
 * Somebody says on the site who they are and what they want written beside
 * their name, and the payment that follows carries only a reference. Until the
 * money arrives the entry stands here, and it is the operator who decides
 * whether it becomes a sponsor or is thrown away.
 */
export const pendingSponsorshipRoutes = new Hono<{ Variables: AuthVariables }>();

pendingSponsorshipRoutes.use("*", requireAdmin);

const entryIdSchema = z.object({ id: z.string().uuid() });

// GET /api/admin/pending-sponsorships — everything waiting, oldest first
pendingSponsorshipRoutes.get("/pending-sponsorships", async (c) =>
  ok(c, await listPendingSponsorships()),
);

// POST /api/admin/pending-sponsorships/:id/takeover — make a sponsor of one
pendingSponsorshipRoutes.post(
  "/pending-sponsorships/:id/takeover",
  validate("param", entryIdSchema),
  validate("json", pendingSponsorshipTakeoverSchema),
  async (c) => {
    const result = await takeOverPendingSponsorship(c.req.valid("param").id, c.req.valid("json"));
    if (!result.ok) return fail(c, 404, "Not found");
    return ok(c, result.sponsor, 201);
  },
);

// DELETE /api/admin/pending-sponsorships/:id
pendingSponsorshipRoutes.delete(
  "/pending-sponsorships/:id",
  validate("param", entryIdSchema),
  async (c) => {
    const removed = await deletePendingSponsorship(c.req.valid("param").id);
    if (!removed) return fail(c, 404, "Not found");
    return ok(c, { message: "Pending sponsorship deleted" });
  },
);
