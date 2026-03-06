import type { FormConfig, FormConfigPayload } from "@lmaa/contracts";

import {
  createFormConfig,
  deleteFormConfig,
  getActiveFormConfigByName,
  getActiveFormConfigBySlug,
  getFormConfigByName,
  getFormConfigBySlug,
  importFormConfig,
  listFormConfigs,
  setFormConfigActive,
  upsertFormConfig,
} from "../repositories/admin-form-config.js";

function rowToFormConfig(row: {
  id: number;
  name: string;
  slug: string | null;
  config: FormConfigPayload;
  isActive: boolean;
}): FormConfig {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    rows: row.config.rows,
    isActive: row.isActive,
    submissionConfig: row.config.submissionConfig,
  };
}

/**
 * Lists all form configurations.
 */
export async function getManagedAdminFormConfigs(): Promise<FormConfig[]> {
  const rows = await listFormConfigs();
  return rows.map(rowToFormConfig);
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
  return { ok: true, data: rowToFormConfig(row) };
}

/**
 * Creates a new empty form config.
 *
 * @param name - Immutable form identifier.
 * @param slug - Initial URL slug.
 * @returns Created form config.
 */
export async function createManagedAdminFormConfig(
  name: string,
  slug: string,
): Promise<{ ok: true; data: FormConfig } | { ok: false; reason: "name_taken" | "slug_taken" }> {
  const existingByName = await getFormConfigByName(name);
  if (existingByName) return { ok: false, reason: "name_taken" };

  const existingBySlug = await getFormConfigBySlug(slug);
  if (existingBySlug) return { ok: false, reason: "slug_taken" };

  const row = await createFormConfig(name, slug);
  return { ok: true, data: rowToFormConfig(row) };
}

/**
 * Upserts a form config, fully replacing its rows.
 *
 * @param name - Form config identifier.
 * @param payload - New configuration payload (may include slug).
 * @returns `{ ok: true, data }` or `{ ok: false, reason }` on slug conflict.
 */
export async function saveManagedAdminFormConfig(
  name: string,
  payload: FormConfigPayload,
): Promise<{ ok: true; data: FormConfig } | { ok: false; reason: "slug_taken" }> {
  // Validate slug uniqueness before saving
  if (payload.slug !== undefined) {
    const existingBySlug = await getFormConfigBySlug(payload.slug);
    if (existingBySlug && existingBySlug.name !== name) {
      return { ok: false, reason: "slug_taken" };
    }
  }

  const row = await upsertFormConfig(name, payload);
  return { ok: true, data: rowToFormConfig(row) };
}

/**
 * Deletes a form config by name.
 *
 * @param name - Form config identifier.
 * @returns `{ ok: true }` if deleted, `{ ok: false }` if not found.
 */
export async function deleteManagedAdminFormConfig(
  name: string,
): Promise<{ ok: true } | { ok: false }> {
  const deleted = await deleteFormConfig(name);
  return deleted ? { ok: true } : { ok: false };
}

/**
 * Sets the active state of a form config.
 *
 * @param name     - Form config identifier.
 * @param isActive - New active state.
 * @returns `{ ok: true, data }` or `{ ok: false }` if not found.
 */
export async function setManagedAdminFormConfigActive(
  name: string,
  isActive: boolean,
): Promise<{ ok: true; data: FormConfig } | { ok: false }> {
  const row = await setFormConfigActive(name, isActive);
  if (!row) return { ok: false };
  return { ok: true, data: rowToFormConfig(row) };
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
  return { ok: true, data: rowToFormConfig(row) };
}

/**
 * Returns the active form config by slug for public frontend rendering.
 *
 * @param slug - Form URL slug.
 * @returns `{ ok: true, data }` or `{ ok: false }`.
 */
export async function getManagedPublicFormConfigBySlug(
  slug: string,
): Promise<{ ok: true; data: FormConfig } | { ok: false }> {
  const row = await getActiveFormConfigBySlug(slug);
  if (!row) return { ok: false };
  return { ok: true, data: rowToFormConfig(row) };
}

/**
 * Imports a form config from an export payload.
 *
 * - Returns `{ ok: false, reason: 'name_taken' }` if the name exists and `overwrite` is `false`.
 * - Returns `{ ok: true, data }` on successful insert or overwrite.
 *
 * @param name     - Target form config name.
 * @param payload  - Export payload containing rows, slug, and submissionConfig.
 * @param overwrite - Whether to overwrite an existing form with the same name.
 */
export async function importManagedFormConfig(
  name: string,
  payload: FormConfigPayload,
  overwrite = false,
): Promise<{ ok: true; data: FormConfig } | { ok: false; reason: "name_taken" }> {
  const row = await importFormConfig(name, payload, overwrite);
  if (!row) return { ok: false, reason: "name_taken" };
  return { ok: true, data: rowToFormConfig(row) };
}
