import type { MarkdownWidget, MarkdownWidgetsConfig } from "@lmaa/contracts";

import { db } from "../db/client.js";
import { markdownWidgets } from "../db/schema.js";

const DEFAULT_CONFIG: MarkdownWidgetsConfig = { widgets: [] };

export async function getMarkdownWidgetsConfig(): Promise<MarkdownWidgetsConfig> {
  const [row] = await db.select().from(markdownWidgets).limit(1);
  return row?.config ?? DEFAULT_CONFIG;
}

export async function upsertMarkdownWidgetsConfig(config: MarkdownWidgetsConfig): Promise<void> {
  await db
    .insert(markdownWidgets)
    .values({ id: 1, config, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: markdownWidgets.id,
      set: { config, updatedAt: new Date() },
    });
}

export async function getEnabledMarkdownWidgetByKey(key: string): Promise<MarkdownWidget | null> {
  const config = await getMarkdownWidgetsConfig();
  return config.widgets.find((widget) => widget.enabled && widget.key === key) ?? null;
}
