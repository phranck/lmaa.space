import { randomBytes } from "node:crypto";

import type { FooterConfig } from "@lmaa/contracts";

const PREVIEW_TTL_MS = 15 * 60_000;

type FooterPreviewSession = {
  config: FooterConfig;
  expiresAt: number;
};

const sessions = new Map<string, FooterPreviewSession>();

function pruneExpiredSessions(now = Date.now()) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

/**
 * Creates a short-lived in-memory preview session for a footer configuration.
 *
 * Sessions expire after 15 minutes. Stale sessions are pruned on each call.
 *
 * @param config - The footer configuration to store.
 * @returns Object with `token` (hex string) and `expiresAt` (ISO timestamp).
 */
export function createFooterPreviewSession(config: FooterConfig) {
  pruneExpiredSessions();
  const expiresAt = Date.now() + PREVIEW_TTL_MS;
  const token = randomBytes(16).toString("hex");
  sessions.set(token, { config, expiresAt });
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Retrieves the footer configuration for a valid, non-expired preview token.
 *
 * @param token - Preview token returned by `createFooterPreviewSession`.
 * @returns `FooterConfig` if the session is valid, `null` if expired or not found.
 */
export function getFooterPreviewSession(token: string): FooterConfig | null {
  pruneExpiredSessions();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.config;
}
