import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { type EmailTemplate, type EmailTemplateInsert, emailTemplates } from "../db/schema.js";

/**
 * Returns all email templates ordered by name.
 */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  return db.select().from(emailTemplates).orderBy(emailTemplates.name);
}

/**
 * Returns a single email template by ID, or `null` if not found.
 */
export async function getEmailTemplateById(id: number): Promise<EmailTemplate | null> {
  const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
  return row ?? null;
}

/**
 * Returns a single email template by name, or `null` if not found.
 */
export async function getEmailTemplateByName(name: string): Promise<EmailTemplate | null> {
  const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.name, name));
  return row ?? null;
}

/**
 * Creates a new email template and returns the created row.
 */
export async function insertEmailTemplate(data: EmailTemplateInsert): Promise<EmailTemplate> {
  const [created] = await db.insert(emailTemplates).values(data).returning();
  return created;
}

/**
 * Updates an email template by ID and returns the updated row, or `null` if not found.
 */
export async function updateEmailTemplate(
  id: number,
  data: Partial<EmailTemplateInsert>,
): Promise<EmailTemplate | null> {
  const [updated] = await db
    .update(emailTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emailTemplates.id, id))
    .returning();
  return updated ?? null;
}

/**
 * Deletes an email template by ID. Returns `true` if a row was deleted.
 */
export async function deleteEmailTemplate(id: number): Promise<boolean> {
  const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id)).returning();
  return result.length > 0;
}
