/**
 * Creates per-user storage keys for segmented-control persistence.
 *
 * Hidden behavior: falls back to `anon` namespace when no authenticated user
 * id is available.
 *
 * @param userId - Current admin user id.
 * @param key - Component-local preference key.
 * @returns Namespaced storage key.
 */
export function getSegmentedStorageKey(userId: number | null | undefined, key: string): string {
  const prefix = typeof userId === "number" && Number.isFinite(userId) ? `u:${userId}` : "anon";
  return `seg:${prefix}:${key}`;
}
