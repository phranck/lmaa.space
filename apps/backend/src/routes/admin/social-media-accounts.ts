import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  socialMediaAccountCreateSchema,
  socialMediaAccountUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import {
  createSocialMediaAccount,
  deleteSocialMediaAccount,
  listSocialMediaAccounts,
  updateSocialMediaAccount,
} from "../../services/social-media-accounts.js";

export const socialMediaAccountRoutes = new Hono<{ Variables: AuthVariables }>();

socialMediaAccountRoutes.use("*", requireAdmin);

socialMediaAccountRoutes.get("/social-media-accounts", async (c) => {
  const accounts = await listSocialMediaAccounts();
  return ok(c, accounts);
});

socialMediaAccountRoutes.post(
  "/social-media-accounts",
  zValidator("json", socialMediaAccountCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const result = await createSocialMediaAccount(payload);
    if (result.ok) return ok(c, result.data, 201);
    if (result.reason === "conflict") {
      return fail(c, 409, `A posting account already exists for ${payload.platform}`);
    }
    if (result.reason === "credential_invalid") {
      return fail(c, 400, result.message);
    }
    return fail(c, 503, result.message);
  },
);

socialMediaAccountRoutes.patch(
  "/social-media-accounts/:id",
  zValidator("json", socialMediaAccountUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    const result = await updateSocialMediaAccount(id, payload);
    if (result.ok) return ok(c, result.data);
    if (result.reason === "not_found") return fail(c, 404, "Social media account not found");
    if (result.reason === "conflict") {
      return fail(c, 409, "A posting account already exists for this platform");
    }
    if (result.reason === "credential_invalid") {
      return fail(c, 400, result.message);
    }
    return fail(c, 503, result.message);
  },
);

socialMediaAccountRoutes.delete("/social-media-accounts/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteSocialMediaAccount(id);
  if (!result.ok) return fail(c, 404, "Social media account not found");
  return ok(c, { deleted: true });
});
