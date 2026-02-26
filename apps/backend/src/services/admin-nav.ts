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

export async function getManagedNavItems(navId: NavId): Promise<NavItem[]> {
  const rows = await listAdminNavItems(navId);
  return rows.map(mapNavRowToApiItem);
}

export async function replaceManagedNavItems(
  navId: NavId,
  items: ReplaceAdminNavItemInput[],
): Promise<NavItem[]> {
  const rows = await replaceAdminNavItems(navId, items);
  return rows.map(mapNavRowToApiItem);
}
