import webPush from "web-push";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  deletePushSubscriptionById,
  getPushSubscriptionsByAdminId,
} from "../repositories/push-subscriptions.js";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

function isConfigured(): boolean {
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/**
 * Sends a Web Push notification to all registered devices of an admin user.
 * Removes stale subscriptions (410 Gone) automatically.
 */
export async function sendPushNotification(adminId: number, payload: PushPayload): Promise<void> {
  if (!isConfigured()) {
    logger.debug("push: VAPID keys not configured, skipping");
    return;
  }

  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

  const subscriptions = await getPushSubscriptionsByAdminId(adminId);
  if (subscriptions.length === 0) return;

  const jsonPayload = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscriptionById(sub.id);
          logger.info({ subscriptionId: sub.id }, "push: removed stale subscription");
        } else {
          logger.warn({ err, subscriptionId: sub.id }, "push: failed to send");
        }
      }
    }),
  );
}
