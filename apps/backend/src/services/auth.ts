import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminUsers, sessions } from "../db/schema.js";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export async function createSession(adminUserId: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.insert(sessions).values({ id: sessionId, adminUserId, expiresAt });

  // Update last login
  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(adminUsers.id, adminUserId));

  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function getAdminCount(): Promise<number> {
  const result = await db.$count(adminUsers);
  return result;
}

export async function findAdminByUsername(username: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);
  return admin ?? null;
}
