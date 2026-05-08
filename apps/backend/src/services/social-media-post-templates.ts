import type { SocialMediaPostTemplate } from "@lmaa/contracts";

import type { SocialMediaPostTemplateInsert } from "../db/schema.js";
import {
  deleteSocialMediaPostTemplate,
  getSocialMediaPostTemplateById,
  getSocialMediaPostTemplateByName,
  insertSocialMediaPostTemplate,
  listSocialMediaPostTemplates,
  updateSocialMediaPostTemplate,
} from "../repositories/social-media-post-templates.js";

function rowToSocialMediaPostTemplate(row: {
  id: number;
  name: string;
  platforms: string[];
  scopes: string[];
  bodyMastodon: string | null;
  bodyBluesky: string | null;
  isSystemTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SocialMediaPostTemplate {
  return {
    id: row.id,
    name: row.name,
    platforms: row.platforms as SocialMediaPostTemplate["platforms"],
    scopes: row.scopes as SocialMediaPostTemplate["scopes"],
    bodyMastodon: row.bodyMastodon,
    bodyBluesky: row.bodyBluesky,
    isSystemTemplate: row.isSystemTemplate,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getManagedSocialMediaPostTemplates(): Promise<SocialMediaPostTemplate[]> {
  const rows = await listSocialMediaPostTemplates();
  return rows.map(rowToSocialMediaPostTemplate);
}

export async function getManagedSocialMediaPostTemplateById(
  id: number,
): Promise<{ ok: true; data: SocialMediaPostTemplate } | { ok: false }> {
  const row = await getSocialMediaPostTemplateById(id);
  if (!row) return { ok: false };
  return { ok: true, data: rowToSocialMediaPostTemplate(row) };
}

export async function createManagedSocialMediaPostTemplate(
  data: SocialMediaPostTemplateInsert,
): Promise<{ ok: true; data: SocialMediaPostTemplate } | { ok: false; reason: "name_taken" }> {
  const existing = await getSocialMediaPostTemplateByName(data.name);
  if (existing) return { ok: false, reason: "name_taken" };
  const row = await insertSocialMediaPostTemplate(data);
  return { ok: true, data: rowToSocialMediaPostTemplate(row) };
}

export async function updateManagedSocialMediaPostTemplate(
  id: number,
  data: Partial<SocialMediaPostTemplateInsert>,
): Promise<{ ok: true; data: SocialMediaPostTemplate } | { ok: false; reason: "not_found" }> {
  const row = await updateSocialMediaPostTemplate(id, data);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: rowToSocialMediaPostTemplate(row) };
}

export async function deleteManagedSocialMediaPostTemplate(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  const deleted = await deleteSocialMediaPostTemplate(id);
  return deleted ? { ok: true } : { ok: false, reason: "not_found" };
}
