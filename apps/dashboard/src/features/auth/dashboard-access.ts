import type { AdminRole } from "@lmaa/shared";

/**
 * Whether a dashboard role may use the administrative overview and reports.
 *
 * @param role - The authenticated user's role, or `undefined` before auth resolves.
 * @returns Whether administrative dashboard routes are available.
 */
export function hasAdminDashboardAccess(role: AdminRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Resolves the first dashboard route an authenticated role may open.
 *
 * @param role - The authenticated user's role.
 * @returns The role's dashboard landing path.
 */
export function dashboardHomePath(role: AdminRole): "/" | "/shops" {
  return role === "moderator" ? "/shops" : "/";
}
