import type { FooterConfig } from "@lmaa/contracts";

import { db } from "../db/index.js";
import { footerConfig } from "../db/schema.js";

const DEFAULT_CONFIG: FooterConfig = { columns: [] };

/**
 * Returns the current footer configuration.
 *
 * Falls back to an empty config when no row exists yet.
 */
export async function getFooterConfig(): Promise<FooterConfig> {
  const [row] = await db.select().from(footerConfig).limit(1);
  return row?.config ?? DEFAULT_CONFIG;
}

/**
 * Persists the footer configuration (upsert, id always = 1).
 *
 * @param config - Validated footer configuration payload.
 */
export async function upsertFooterConfig(config: FooterConfig): Promise<void> {
  await db
    .insert(footerConfig)
    .values({ id: 1, config, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: footerConfig.id,
      set: { config, updatedAt: new Date() },
    });
}
