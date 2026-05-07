import type { MastodonPostTemplate } from "@lmaa/contracts";

import type { MastodonPostTemplateInsert } from "../db/schema.js";
import {
  deleteMastodonPostTemplate,
  getMastodonPostTemplateById,
  getMastodonPostTemplateByName,
  insertMastodonPostTemplate,
  listMastodonPostTemplates,
  updateMastodonPostTemplate,
} from "../repositories/mastodon-post-templates.js";

function rowToMastodonPostTemplate(row: {
  id: number;
  name: string;
  bodyText: string;
  isSystemTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MastodonPostTemplate {
  return {
    id: row.id,
    name: row.name,
    bodyText: row.bodyText,
    isSystemTemplate: row.isSystemTemplate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getManagedMastodonPostTemplates(): Promise<MastodonPostTemplate[]> {
  const rows = await listMastodonPostTemplates();
  return rows.map(rowToMastodonPostTemplate);
}

export async function getManagedMastodonPostTemplateById(
  id: number,
): Promise<{ ok: true; data: MastodonPostTemplate } | { ok: false }> {
  const row = await getMastodonPostTemplateById(id);
  if (!row) return { ok: false };
  return { ok: true, data: rowToMastodonPostTemplate(row) };
}

export async function createManagedMastodonPostTemplate(
  data: MastodonPostTemplateInsert,
): Promise<{ ok: true; data: MastodonPostTemplate } | { ok: false; reason: "name_taken" }> {
  const existing = await getMastodonPostTemplateByName(data.name);
  if (existing) return { ok: false, reason: "name_taken" };
  const row = await insertMastodonPostTemplate(data);
  return { ok: true, data: rowToMastodonPostTemplate(row) };
}

export async function updateManagedMastodonPostTemplate(
  id: number,
  data: Partial<MastodonPostTemplateInsert>,
): Promise<{ ok: true; data: MastodonPostTemplate } | { ok: false; reason: "not_found" }> {
  const row = await updateMastodonPostTemplate(id, data);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToMastodonPostTemplate(row) };
}

export async function deleteManagedMastodonPostTemplate(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteMastodonPostTemplate(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
