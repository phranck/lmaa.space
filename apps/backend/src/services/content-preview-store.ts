import { randomBytes } from "node:crypto";

import type { ContentPreviewSessionPayload } from "@lmaa/contracts";

const PREVIEW_TTL_MS = 15 * 60_000;

type ContentPreviewSession = {
  page: ContentPreviewSessionPayload;
  expiresAt: number;
};

const sessions = new Map<string, ContentPreviewSession>();

function pruneExpiredSessions(now = Date.now()) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

/**
 * Creates a short-lived in-memory preview session for a content page.
 *
 * @param page - Render-ready content page preview payload.
 * @returns Preview token and expiry timestamp.
 */
export function createContentPreviewSession(page: ContentPreviewSessionPayload) {
  pruneExpiredSessions();
  const expiresAt = Date.now() + PREVIEW_TTL_MS;
  const token = randomBytes(16).toString("hex");
  sessions.set(token, { page, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Retrieves a valid content preview session by token.
 *
 * @param token - Preview token returned by `createContentPreviewSession`.
 * @returns Render-ready page payload or `null` when missing/expired.
 */
export function getContentPreviewSession(token: string): ContentPreviewSessionPayload | null {
  pruneExpiredSessions();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.page;
}
