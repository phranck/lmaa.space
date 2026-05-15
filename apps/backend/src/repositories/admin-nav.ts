import { asc, eq } from "drizzle-orm";

import type { NavId, NavTarget } from "@lmaa/shared";

import { db } from "../db/client.js";
import { contentPages, navItems } from "../db/schema.js";

/**
 * Normalized navigation item returned to the dashboard editor.
 */
interface AdminNavItemRow {
  id: number;
  navId: NavId;
  pageSlug: string | null;
  pageTitle: string | null;
  url: string | null;
  target: NavTarget;
  label: string | null;
  position: number;
}

/**
 * Input shape for replacing one navigation set.
 */
export interface ReplaceAdminNavItemInput {
  pageSlug: string | null;
  url: string | null;
  target: NavTarget;
  label: string | null;
}

/**
 * Reads all navigation items for one nav area.
 *
 * @param navId - Navigation collection (`header` or `footer`).
 * @returns Items with resolved page titles, ordered by `position`.
 */
export async function listAdminNavItems(navId: NavId): Promise<AdminNavItemRow[]> {
  return db
    .select({
      id: navItems.id,
      navId: navItems.navId,
      pageSlug: navItems.pageSlug,
      pageTitle: contentPages.title,
      url: navItems.url,
      target: navItems.target,
      label: navItems.label,
      position: navItems.position,
    })
    .from(navItems)
    .leftJoin(contentPages, eq(navItems.pageSlug, contentPages.slug))
    .where(eq(navItems.navId, navId))
    .orderBy(asc(navItems.position));
}

/**
 * Replaces all items of a navigation area atomically.
 *
 * Hidden behavior: existing items are deleted first, then recreated with
 * sequential positions based on input order.
 *
 * @param navId - Target nav collection.
 * @param items - Complete replacement set.
 * @returns Fresh list after replacement.
 */
export async function replaceAdminNavItems(
  navId: NavId,
  items: ReplaceAdminNavItemInput[],
): Promise<AdminNavItemRow[]> {
  await db.transaction(async (tx) => {
    await tx.delete(navItems).where(eq(navItems.navId, navId));

    if (items.length > 0) {
      await tx.insert(navItems).values(
        items.map((item, position) => ({
          navId,
          pageSlug: item.pageSlug,
          url: item.url,
          target: item.target,
          label: item.label,
          position,
        })),
      );
    }
  });

  return listAdminNavItems(navId);
}
