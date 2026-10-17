import { describe, expect, it } from "vitest";

import type { AdminRole } from "@lmaa/shared";

import { dashboardHomePath, hasAdminDashboardAccess } from "./dashboard-access.ts";

const ADMIN_ROLES: AdminRole[] = ["owner", "admin"];

describe("dashboard role access", () => {
  it.each(ADMIN_ROLES)("keeps %s on the administrative overview", (role) => {
    expect(dashboardHomePath(role)).toBe("/");
    expect(hasAdminDashboardAccess(role)).toBe(true);
  });

  it("sends moderators to shop management without administrative routes", () => {
    expect(dashboardHomePath("moderator")).toBe("/shops");
    expect(hasAdminDashboardAccess("moderator")).toBe(false);
  });
});
