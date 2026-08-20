import { Hono } from "hono";
import { z } from "zod";

import { env } from "../../config/env.js";
import { ok } from "../../lib/http.js";
import type { AuthVariables } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate-request.js";
import {
  deletePushSubscriptionByEndpoint,
  upsertPushSubscription,
} from "../../repositories/push-subscriptions.js";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const pushRoutes = new Hono<{ Variables: AuthVariables }>();

pushRoutes.get("/push/vapid-public-key", (c) => {
  return ok(c, { vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null });
});

pushRoutes.post("/push/subscribe", validate("json", subscribeSchema), async (c) => {
  const adminId = c.get("adminId");
  const { endpoint, keys } = c.req.valid("json");
  await upsertPushSubscription(adminId, endpoint, keys.p256dh, keys.auth);
  return ok(c, null, 201);
});

pushRoutes.post("/push/unsubscribe", validate("json", unsubscribeSchema), async (c) => {
  const adminId = c.get("adminId");
  const { endpoint } = c.req.valid("json");
  await deletePushSubscriptionByEndpoint(adminId, endpoint);
  return ok(c, null);
});
