export interface AdminUser {
  id: number;
  username: string;
  email: string;
  isOwner: boolean;
  createdAt: string;
  lastLoginAt: string | null;
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
