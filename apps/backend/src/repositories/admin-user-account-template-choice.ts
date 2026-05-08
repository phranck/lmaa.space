import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type AdminUserAccountTemplateChoice,
  adminUserAccountTemplateChoice,
} from "../db/schema.js";

export async function listChoicesForAdminUser(
  adminUserId: number,
): Promise<AdminUserAccountTemplateChoice[]> {
  return db
    .select()
    .from(adminUserAccountTemplateChoice)
    .where(eq(adminUserAccountTemplateChoice.adminUserId, adminUserId));
}

export async function upsertChoice(
  adminUserId: number,
  socialMediaAccountId: number,
  templateId: number | null,
): Promise<void> {
  await db
    .insert(adminUserAccountTemplateChoice)
    .values({ adminUserId, socialMediaAccountId, templateId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        adminUserAccountTemplateChoice.adminUserId,
        adminUserAccountTemplateChoice.socialMediaAccountId,
      ],
      set: { templateId, updatedAt: new Date() },
    });
}
