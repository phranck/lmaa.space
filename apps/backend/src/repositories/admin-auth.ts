import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers } from "../db/schema.js";

export interface CreateOwnerAdminInput {
  username: string;
  email: string;
  passwordHash: string;
}

export interface AdminProfileRow {
  id: number;
  username: string;
  email: string;
  role: "owner" | "admin" | "moderator";
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function createOwnerAdmin(input: CreateOwnerAdminInput) {
  const [admin] = await db
    .insert(adminUsers)
    .values({
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      role: "owner",
    })
    .returning({
      id: adminUsers.id,
      username: adminUsers.username,
      role: adminUsers.role,
    });

  return admin;
}

export async function getAdminProfileById(adminId: number): Promise<AdminProfileRow | null> {
  const [admin] = await db
    .select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      role: adminUsers.role,
      firstName: adminUsers.firstName,
      lastName: adminUsers.lastName,
      avatarUrl: adminUsers.avatarUrl,
      createdAt: adminUsers.createdAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, adminId))
    .limit(1);

  return admin ?? null;
}
