import type { FormConfigPayload } from "@lmaa/contracts";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { type FormConfigRow, formConfigs } from "../db/schema.js";

/**
 * Returns all form configuration records.
 */
export async function listFormConfigs(): Promise<FormConfigRow[]> {
  return db.select().from(formConfigs).orderBy(formConfigs.name);
}

/**
 * Returns a single form config by name, or `null` if not found.
 *
 * @param name - Form config name (e.g. `"suggestion-form"`).
 */
export async function getFormConfigByName(name: string): Promise<FormConfigRow | null> {
  const [row] = await db.select().from(formConfigs).where(eq(formConfigs.name, name));
  return row ?? null;
}

/**
 * Returns a single form config by slug, or `null` if not found.
 *
 * @param slug - Form config slug (e.g. `"mein-formular"`).
 */
export async function getFormConfigBySlug(slug: string): Promise<FormConfigRow | null> {
  const [row] = await db.select().from(formConfigs).where(eq(formConfigs.slug, slug));
  return row ?? null;
}

/**
 * Returns only active form configs by name.
 */
export async function getActiveFormConfigByName(name: string): Promise<FormConfigRow | null> {
  const [row] = await db.select().from(formConfigs).where(eq(formConfigs.name, name));
  return row?.isActive ? row : null;
}

/**
 * Returns only active form configs by slug.
 */
export async function getActiveFormConfigBySlug(slug: string): Promise<FormConfigRow | null> {
  const [row] = await db.select().from(formConfigs).where(eq(formConfigs.slug, slug));
  return row?.isActive ? row : null;
}

/**
 * Creates a new empty form config with the given name and slug.
 *
 * @param name - Immutable form identifier.
 * @param slug - Initial URL slug (defaults to name if not provided).
 * @returns The created form config row.
 */
export async function createFormConfig(name: string, slug?: string): Promise<FormConfigRow> {
  const [created] = await db
    .insert(formConfigs)
    .values({ name, slug: slug ?? name, config: { rows: [] } })
    .returning();
  return created;
}

/**
 * Upserts (creates or fully replaces) a form config by name.
 *
 * @param name - Form config name.
 * @param payload - Row configuration payload (may include `slug`).
 * @returns The saved form config row.
 */
export async function upsertFormConfig(
  name: string,
  payload: FormConfigPayload,
): Promise<FormConfigRow> {
  const existing = await getFormConfigByName(name);

  if (existing) {
    const [updated] = await db
      .update(formConfigs)
      .set({
        config: payload,
        slug: payload.slug !== undefined ? payload.slug : existing.slug,
        updatedAt: new Date(),
      })
      .where(eq(formConfigs.name, name))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(formConfigs)
    .values({ name, config: payload, slug: payload.slug ?? name })
    .returning();
  return created;
}

/**
 * Deletes a form config by name. Returns `true` if a row was deleted.
 *
 * @param name - Form config name.
 */
export async function deleteFormConfig(name: string): Promise<boolean> {
  const result = await db.delete(formConfigs).where(eq(formConfigs.name, name)).returning();
  return result.length > 0;
}
