export type AdminRole = "owner" | "admin" | "moderator";

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

export interface AdminStats {
  shops: number;
  categories: number;
  pendingSubmissions: number;
  totalSubmissions: number;
  deadLinkReports: number;
}

export interface AdminSetup {
  username: string;
  email: string;
  password: string;
}

export interface AdminLogin {
  username: string;
  password: string;
}
