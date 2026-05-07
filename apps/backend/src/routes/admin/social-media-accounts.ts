import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { mastodonAccountCreateSchema, mastodonAccountUpdateSchema } from "@lmaa/contracts";

import { fail, ok } from "../../lib/http.js";
import { parseId } from "../../lib/validate.js";
import { type AuthVariables, requireAdmin } from "../../middleware/auth.js";
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
    const account = await createManagedMastodonAccount(c.req.valid("json"));
    return ok(c, account, 201);
  },
);

socialMediaAccountRoutes.put(
  "/social-media/mastodon/accounts/:id",
  zValidator("json", mastodonAccountUpdateSchema),
  async (c) => {
    const id = parseId(c.req.param("id"));
    if (!id) return fail(c, 400, "Invalid ID");
    const result = await updateManagedMastodonAccount(id, c.req.valid("json"));
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
