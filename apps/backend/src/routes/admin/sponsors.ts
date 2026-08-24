import { Hono } from "hono";
import { z } from "zod";

import { sponsorInputSchema, sponsoringConfigSchema } from "@lmaa/contracts";
import { socialMediaSchema } from "@lmaa/shared";

import { fail, ok } from "../../lib/http.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deleteSponsor,
  getSponsor,
  insertSponsor,
  listSponsors,
  updateSponsor,
} from "../../repositories/sponsors.js";
import { resolveSponsorAvatar } from "../../services/sponsor-avatar.js";
import { getSponsoringConfig, putSponsoringConfig } from "../../services/sponsors.js";

/**
 * Managing the people who carry the running costs, and what those costs are.
 */
export const sponsorRoutes = new Hono<{ Variables: AuthVariables }>();

sponsorRoutes.use("*", requireAdmin);

const sponsorIdSchema = z.object({ id: z.string().uuid() });

// GET /api/admin/sponsors — every sponsor, current or past
sponsorRoutes.get("/sponsors", async (c) => ok(c, await listSponsors()));

// GET /api/admin/sponsors/config — what the year costs and the threshold
sponsorRoutes.get("/sponsors/config", async (c) => ok(c, await getSponsoringConfig()));

// PUT /api/admin/sponsors/config
sponsorRoutes.put("/sponsors/config", validate("json", sponsoringConfigSchema), async (c) => {
  const config = c.req.valid("json");
  await putSponsoringConfig(config);
  return ok(c, config);
});

// POST /api/admin/sponsors
sponsorRoutes.post("/sponsors", validate("json", sponsorInputSchema), async (c) =>
  ok(c, await insertSponsor(c.req.valid("json"))),
);

// POST /api/admin/sponsors/avatar — the picture behind a pasted address
//
// Resolved here rather than in the browser, so the stored address is one the
// site serves itself and no visitor's browser calls a foreign instance.
sponsorRoutes.post(
  "/sponsors/avatar",
  validate("json", z.object({ socialMedia: socialMediaSchema })),
  async (c) => {
    const { socialMedia } = c.req.valid("json");
    return ok(c, { imageUrl: await resolveSponsorAvatar(socialMedia ?? []) });
  },
);

// GET /api/admin/sponsors/:id
sponsorRoutes.get("/sponsors/:id", validate("param", sponsorIdSchema), async (c) => {
  const sponsor = await getSponsor(c.req.valid("param").id);
  if (!sponsor) return fail(c, 404, "Not found");
  return ok(c, sponsor);
});

// PUT /api/admin/sponsors/:id
sponsorRoutes.put(
  "/sponsors/:id",
  validate("param", sponsorIdSchema),
  validate("json", sponsorInputSchema),
  async (c) => {
    const updated = await updateSponsor(c.req.valid("param").id, c.req.valid("json"));
    if (!updated) return fail(c, 404, "Not found");
    return ok(c, updated);
  },
);

// DELETE /api/admin/sponsors/:id
sponsorRoutes.delete("/sponsors/:id", validate("param", sponsorIdSchema), async (c) => {
  const removed = await deleteSponsor(c.req.valid("param").id);
  if (!removed) return fail(c, 404, "Not found");
  return ok(c, { message: "Sponsor deleted" });
});
