import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { mastodonAccountCreateSchema, mastodonAccountUpdateSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { verifyMastodonCredentials } from "../../services/mastodon-account-validator.js";
import {
  createManagedMastodonAccount,
  deleteManagedMastodonAccount,
  getManagedMastodonAccounts,
  updateManagedMastodonAccount,
} from "../../services/social-media-accounts.js";

export const socialMediaAccountRoutes = new Hono<{ Variables: AuthVariables }>();

socialMediaAccountRoutes.use("*", requireAdmin);

socialMediaAccountRoutes.get("/social-media/mastodon/accounts", async (c) => {
  const accounts = await getManagedMastodonAccounts();
  return ok(c, accounts);
});

socialMediaAccountRoutes.post(
  "/social-media/mastodon/accounts",
  zValidator("json", mastodonAccountCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const verify = await verifyMastodonCredentials(payload.instanceUrl, payload.accessToken);
    if (!verify.ok) {
      return verify.reason === "invalid_token"
        ? fail(c, 400, "Mastodon rejected the access token")
        : fail(c, 503, "Mastodon instance unreachable");
    }
    const account = await createManagedMastodonAccount({
      ...payload,
      username: payload.username ?? verify.username,
    });
    return ok(c, account, 201);
  },
);

socialMediaAccountRoutes.put(
  "/social-media/mastodon/accounts/:id",
  zValidator("json", mastodonAccountUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    if (payload.accessToken) {
      const instanceUrl = payload.instanceUrl;
      if (!instanceUrl) return fail(c, 400, "instanceUrl is required when updating the access token");
      const verify = await verifyMastodonCredentials(instanceUrl, payload.accessToken);
      if (!verify.ok) {
        return verify.reason === "invalid_token"
          ? fail(c, 400, "Mastodon rejected the access token")
          : fail(c, 503, "Mastodon instance unreachable");
      }
    }
    const result = await updateManagedMastodonAccount(id, payload);
    if (!result.ok) return fail(c, 404, "Mastodon account not found");
    return ok(c, result.data);
  },
);

socialMediaAccountRoutes.delete("/social-media/mastodon/accounts/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedMastodonAccount(id);
  if (!result.ok) return fail(c, 404, "Mastodon account not found");
  return ok(c, { deleted: true });
});
