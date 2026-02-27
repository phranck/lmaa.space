import type { AdminRole } from "../constants/domain.js";

/**
 * Re-exported admin role union from domain constants.
 */
export type { AdminRole };

/**
 * Public admin user representation used by dashboard user management.
 */
export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: AdminRole;
  isOwner: boolean; // computed: role === "owner"
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * Dashboard counters returned by admin stats endpoints.
 */
export interface AdminStats {
  shops: number;
  categories: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  deadLinkReports: number;
}

/**
 * Payload for bootstrapping the first owner account.
 */
export interface AdminSetup {
  username: string;
  email: string;
  password: string;
}

/**
 * Payload for admin sign-in.
 */
export interface AdminLogin {
  username: string;
  password: string;
}
