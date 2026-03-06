/**
 * Generates a compact random rejection token (32 hex chars, no dashes).
 *
 * @returns Unique token string used for public rejection page URLs.
 */
export function generateRejectionToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
