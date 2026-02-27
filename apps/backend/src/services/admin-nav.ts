import type { NavId, NavItem } from "@lmaa/shared";
import {
  type ReplaceAdminNavItemInput,
  listAdminNavItems,
  replaceAdminNavItems,
} from "../repositories/admin-nav.js";

function mapNavRowToApiItem(row: Awaited<ReturnType<typeof listAdminNavItems>>[number]): NavItem {
  return {
    id: row.id,
    navId: row.navId,
    pageSlug: row.pageSlug,
    pageTitle: row.pageTitle,
    url: row.url,
    target: row.target,
    label: row.label,
    position: row.position,
  };
}

/**
 * Lists navigation items for one admin-managed nav bucket.
 *
 * @param navId - Navigation target (`header` or `footer`).
 * @returns Ordered list of normalized nav items.
 */
export async function getManagedNavItems(navId: NavId): Promise<NavItem[]> {
  const rows = await listAdminNavItems(navId);
  return rows.map(mapNavRowToApiItem);
}

/**
 * Replaces all navigation items for a nav bucket transactionally.
 *
 * @param navId - Navigation target (`header` or `footer`).
 * @param items - Full replacement set for that nav bucket.
 * @returns Persisted and re-ordered nav item list.
 */
export async function replaceManagedNavItems(
  navId: NavId,
  items: ReplaceAdminNavItemInput[],
): Promise<NavItem[]> {
  const rows = await replaceAdminNavItems(navId, items);
  return rows.map(mapNavRowToApiItem);
}
