import Sqids from "sqids";

const sqids = new Sqids({
  alphabet: "abcdefghijklmnopqrstuvwxyz0123456789",
  minLength: 8,
});

/**
 * Encodes a numeric shop ID into a URL-safe token.
 */
export function encodeShopToken(id: number): string {
  return sqids.encode([id]);
}

/**
 * Decodes a shop token back to its numeric ID.
 *
 * @returns The shop ID, or `null` if the token is invalid.
 */
export function decodeShopToken(token: string): number | null {
  const ids = sqids.decode(token);
  if (ids.length !== 1) return null;
  const id = ids[0];
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
