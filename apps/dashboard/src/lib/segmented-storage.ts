export function getSegmentedStorageKey(userId: number | null | undefined, key: string): string {
  const prefix = typeof userId === "number" && Number.isFinite(userId) ? `u:${userId}` : "anon";
  return `seg:${prefix}:${key}`;
}
