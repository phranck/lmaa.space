import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { pushSubscriptions } from "../db/schema.js";

export async function upsertPushSubscription(
  adminId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.adminId, adminId), eq(pushSubscriptions.endpoint, endpoint)))
    .limit(1);

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh, auth })
      .where(eq(pushSubscriptions.id, existing.id));
  } else {
    await db.insert(pushSubscriptions).values({ adminId, endpoint, p256dh, auth });
  }
}

export async function getPushSubscriptionsByAdminId(adminId: number) {
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.adminId, adminId));
}

export async function deletePushSubscriptionByEndpoint(
  adminId: number,
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.adminId, adminId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function deletePushSubscriptionById(id: number): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
}
