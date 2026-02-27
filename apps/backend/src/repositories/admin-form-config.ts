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
 * Returns only active form configs.
 */
export async function getActiveFormConfigByName(name: string): Promise<FormConfigRow | null> {
  const [row] = await db.select().from(formConfigs).where(eq(formConfigs.name, name));
  return row?.isActive ? row : null;
}

/**
 * Upserts (creates or fully replaces) a form config by name.
 *
 * @param name - Form config name.
 * @param payload - Row configuration payload.
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
      .set({ config: payload, updatedAt: new Date() })
      .where(eq(formConfigs.name, name))
      .returning();
    return updated;
  }

  const [created] = await db.insert(formConfigs).values({ name, config: payload }).returning();
  return created;
}
