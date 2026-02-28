import type { EmailTemplate } from "@lmaa/contracts";
import type { EmailTemplateInsert } from "../db/schema.js";
import {
  deleteEmailTemplate,
  getEmailTemplateById,
  getEmailTemplateByName,
  insertEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "../repositories/email-templates.js";

function rowToEmailTemplate(row: {
  id: number;
  name: string;
  subject: string;
  headerBannerUrl: string | null;
  headerText: string | null;
  bodyText: string;
  footerBannerUrl: string | null;
  footerText: string | null;
  isSystemTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}): EmailTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    headerBannerUrl: row.headerBannerUrl,
    headerText: row.headerText,
    bodyText: row.bodyText,
    footerBannerUrl: row.footerBannerUrl,
    footerText: row.footerText,
    isSystemTemplate: row.isSystemTemplate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lists all email templates.
 */
export async function getManagedEmailTemplates(): Promise<EmailTemplate[]> {
  const rows = await listEmailTemplates();
  return rows.map(rowToEmailTemplate);
}

/**
 * Returns an email template by ID.
 *
 * @returns `{ ok: true, data }` or `{ ok: false }` if not found.
 */
export async function getManagedEmailTemplateById(
  id: number,
): Promise<{ ok: true; data: EmailTemplate } | { ok: false }> {
  const row = await getEmailTemplateById(id);
  if (!row) return { ok: false };
  return { ok: true, data: rowToEmailTemplate(row) };
}

/**
 * Creates a new email template.
 *
 * @returns `{ ok: true, data }` or `{ ok: false, reason: "name_taken" }`.
 */
export async function createManagedEmailTemplate(
  data: Omit<EmailTemplateInsert, "isSystemTemplate">,
): Promise<{ ok: true; data: EmailTemplate } | { ok: false; reason: "name_taken" }> {
  const existing = await getEmailTemplateByName(data.name);
  if (existing) return { ok: false, reason: "name_taken" };
  const row = await insertEmailTemplate(data);
  return { ok: true, data: rowToEmailTemplate(row) };
}

/**
 * Updates an email template by ID.
 *
 * @returns `{ ok: true, data }` or `{ ok: false, reason: "not_found" }`.
 */
export async function updateManagedEmailTemplate(
  id: number,
  data: Partial<Omit<EmailTemplateInsert, "isSystemTemplate">>,
): Promise<{ ok: true; data: EmailTemplate } | { ok: false; reason: "not_found" }> {
  const existing = await getEmailTemplateById(id);
  if (!existing) return { ok: false, reason: "not_found" };
  const row = await updateEmailTemplate(id, data);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToEmailTemplate(row) };
}

/**
 * Deletes an email template by ID.
 *
 * @returns `{ ok: true }` or `{ ok: false, reason: "not_found" }`.
 */
export async function deleteManagedEmailTemplate(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteEmailTemplate(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
