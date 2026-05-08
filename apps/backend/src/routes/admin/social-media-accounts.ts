import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import {
  blueskyAccountCreateSchema,
  blueskyAccountUpdateSchema,
  mastodonAccountCreateSchema,
  mastodonAccountUpdateSchema,
} from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
import { verifyBlueskyCredentials } from "../../services/bluesky-account-validator.js";
import { verifyMastodonCredentials } from "../../services/mastodon-account-validator.js";
import {
  createManagedBlueskyAccount,
  createManagedMastodonAccount,
  deleteManagedBlueskyAccount,
  deleteManagedMastodonAccount,
  getManagedBlueskyAccount,
  getManagedMastodonAccount,
  updateManagedBlueskyAccount,
  updateManagedMastodonAccount,
} from "../../services/social-media-accounts.js";

export const socialMediaAccountRoutes = new Hono<{ Variables: AuthVariables }>();

socialMediaAccountRoutes.use("*", requireAdmin);

// ─── Mastodon ────────────────────────────────────────────────────────────────

socialMediaAccountRoutes.get("/social-media/mastodon/account", async (c) => {
  const account = await getManagedMastodonAccount();
  return ok(c, account);
});

socialMediaAccountRoutes.post(
  "/social-media/mastodon/account",
  zValidator("json", mastodonAccountCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const verify = await verifyMastodonCredentials(payload.instanceUrl, payload.accessToken);
    if (!verify.ok) {
      return verify.reason === "invalid_token"
        ? fail(c, 400, "Mastodon rejected the access token")
        : fail(c, 503, "Mastodon instance unreachable");
    }
    const result = await createManagedMastodonAccount({
      ...payload,
      username: payload.username ?? verify.username,
    });
    if (!result.ok) return fail(c, 409, "A Mastodon account is already configured");
    return ok(c, result.data, 201);
  },
);

socialMediaAccountRoutes.put(
  "/social-media/mastodon/account/:id",
  zValidator("json", mastodonAccountUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    if (payload.accessToken) {
      const instanceUrl = payload.instanceUrl;
      if (!instanceUrl) {
        return fail(c, 400, "instanceUrl is required when updating the access token");
      }
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

socialMediaAccountRoutes.delete("/social-media/mastodon/account/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedMastodonAccount(id);
  if (!result.ok) return fail(c, 404, "Mastodon account not found");
  return ok(c, { deleted: true });
});

// ─── BlueSky ─────────────────────────────────────────────────────────────────

socialMediaAccountRoutes.get("/social-media/bluesky/account", async (c) => {
  const account = await getManagedBlueskyAccount();
  return ok(c, account);
});

socialMediaAccountRoutes.post(
  "/social-media/bluesky/account",
  zValidator("json", blueskyAccountCreateSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const verify = await verifyBlueskyCredentials(payload.handle, payload.appPassword);
    if (!verify.ok) {
      return verify.reason === "invalid_credentials"
        ? fail(c, 400, "BlueSky rejected the credentials")
        : fail(c, 503, "BlueSky service unreachable");
    }
    const result = await createManagedBlueskyAccount(payload);
    if (!result.ok) return fail(c, 409, "A BlueSky account is already configured");
    return ok(c, result.data, 201);
  },
);

socialMediaAccountRoutes.put(
  "/social-media/bluesky/account/:id",
  zValidator("json", blueskyAccountUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const payload = c.req.valid("json");
    if (payload.appPassword) {
      const handle = payload.handle;
      if (!handle) return fail(c, 400, "handle is required when updating the app password");
      const verify = await verifyBlueskyCredentials(handle, payload.appPassword);
      if (!verify.ok) {
        return verify.reason === "invalid_credentials"
          ? fail(c, 400, "BlueSky rejected the credentials")
          : fail(c, 503, "BlueSky service unreachable");
      }
    }
    const result = await updateManagedBlueskyAccount(id, payload);
    if (!result.ok) return fail(c, 404, "BlueSky account not found");
    return ok(c, result.data);
  },
);

socialMediaAccountRoutes.delete("/social-media/bluesky/account/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return fail(c, 400, "Invalid ID");
  const result = await deleteManagedBlueskyAccount(id);
  if (!result.ok) return fail(c, 404, "BlueSky account not found");
  return ok(c, { deleted: true });
});
