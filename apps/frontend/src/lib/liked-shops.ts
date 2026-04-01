/**
 * Liked shops persistence (localStorage) and compact URL encoding.
 *
 * Used by LikedShopsGrid (React island) and shop-actions.ts (vanilla JS).
 */

const LIKES_KEY = "lmaa-liked-shops";

// ── localStorage helpers ────────────────────────────────────────────

export function getLikedShopIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveLikedShopIds(ids: Set<string>): void {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...ids]));
}

// ── Compact URL encoding ────────────────────────────────────────────
// Sorted numeric IDs -> delta-encoded -> base36 -> joined with "-"

export function encodeLikedIds(ids: string[]): string {
  const nums = ids
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (nums.length === 0) return "";
  const deltas: number[] = [nums[0]];
  for (let i = 1; i < nums.length; i++) {
    deltas.push(nums[i] - nums[i - 1]);
  }
  return deltas.map((d) => d.toString(36)).join("-");
}

export function decodeLikedIds(encoded: string): string[] {
  if (!encoded) return [];
  const deltas = encoded.split("-").map((s) => Number.parseInt(s, 36));
  if (deltas.some((d) => Number.isNaN(d))) return [];
  const ids: number[] = [];
  let current = 0;
  for (const delta of deltas) {
    current += delta;
    ids.push(current);
  }
  return ids.map(String);
}

// ── Import param parsing ────────────────────────────────────────────

export function parseImportParam(): { ids: string[]; cleanUrl: string } | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("s");
  if (!encoded) return null;

  const ids = decodeLikedIds(encoded);
  if (ids.length === 0) return null;

  params.delete("s");
  const clean = params.toString();
  const cleanUrl = `${window.location.pathname}${clean ? `?${clean}` : ""}`;

  return { ids, cleanUrl };
}
