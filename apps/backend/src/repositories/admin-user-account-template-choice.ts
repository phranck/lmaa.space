import { and, eq } from "drizzle-orm";

import type { SocialMediaPostTemplateScope } from "@lmaa/contracts";

import { db } from "../db/client.js";
import {
  type AdminUserAccountTemplateChoice,
  adminUserAccountTemplateChoice,
} from "../db/schema.js";

export async function listChoicesForAdminUser(
  adminUserId: number,
  scope: SocialMediaPostTemplateScope,
): Promise<AdminUserAccountTemplateChoice[]> {
  return db
    .select()
    .from(adminUserAccountTemplateChoice)
    .where(
      and(
        eq(adminUserAccountTemplateChoice.adminUserId, adminUserId),
        eq(adminUserAccountTemplateChoice.scope, scope),
      ),
    );
}

export async function upsertChoice(
  adminUserId: number,
  socialMediaAccountId: number,
  templateId: number | null,
  scope: SocialMediaPostTemplateScope,
): Promise<void> {
  await db
    .insert(adminUserAccountTemplateChoice)
    .values({ adminUserId, socialMediaAccountId, templateId, scope, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        adminUserAccountTemplateChoice.adminUserId,
        adminUserAccountTemplateChoice.socialMediaAccountId,
        adminUserAccountTemplateChoice.scope,
      ],
      set: { templateId, updatedAt: new Date() },
    });
}
