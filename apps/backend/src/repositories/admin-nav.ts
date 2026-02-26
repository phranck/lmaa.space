import type { NavId, NavTarget } from "@lmaa/shared";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { contentPages, navItems } from "../db/schema.js";

export interface AdminNavItemRow {
  id: number;
  navId: NavId;
  pageSlug: string | null;
  pageTitle: string | null;
  url: string | null;
  target: NavTarget;
  label: string | null;
  position: number;
}

export interface ReplaceAdminNavItemInput {
  pageSlug: string | null;
  url: string | null;
  target: NavTarget;
  label: string | null;
}

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
