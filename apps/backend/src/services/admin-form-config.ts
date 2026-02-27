import type { FormConfig, FormConfigPayload } from "@lmaa/contracts";
import {
  getActiveFormConfigByName,
  getFormConfigByName,
  listFormConfigs,
  upsertFormConfig,
} from "../repositories/admin-form-config.js";

/**
 * Lists all form configurations.
 */
export async function getManagedAdminFormConfigs(): Promise<FormConfig[]> {
  const rows = await listFormConfigs();
  return rows.map((r) => ({ id: r.id, name: r.name, rows: r.config.rows, isActive: r.isActive }));
}

/**
 * Returns a form config by name for admin editing.
 *
 * @param name - Form config identifier.
 * @returns `{ ok: true, data }` or `{ ok: false }`.
 */
export async function getManagedAdminFormConfigByName(
  name: string,
): Promise<{ ok: true; data: FormConfig } | { ok: false }> {
  const row = await getFormConfigByName(name);
  if (!row) return { ok: false };
  return { ok: true, data: { id: row.id, name: row.name, rows: row.config.rows, isActive: row.isActive } };
}

/**
 * Upserts a form config, fully replacing its rows.
 *
 * @param name - Form config identifier.
 * @param payload - New configuration payload.
 * @returns Updated form config.
 */
export async function saveManagedAdminFormConfig(
  name: string,
  payload: FormConfigPayload,
): Promise<FormConfig> {
  const row = await upsertFormConfig(name, payload);
  return { id: row.id, name: row.name, rows: row.config.rows, isActive: row.isActive };
}

/**
 * Returns the active form config by name for public consumption.
 *
 * @param name - Form config identifier.
 * @returns `{ ok: true, data }` or `{ ok: false }`.
 */
export async function getManagedPublicFormConfig(
  name: string,
): Promise<{ ok: true; data: FormConfig } | { ok: false }> {
  const row = await getActiveFormConfigByName(name);
  if (!row) return { ok: false };
  return { ok: true, data: { id: row.id, name: row.name, rows: row.config.rows, isActive: row.isActive } };
}
