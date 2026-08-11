/**
 * Reads how long a response may be reused from its `Cache-Control` header.
 *
 * @param cacheControl - Header value, or `null` when absent.
 * @returns Seconds the response stays valid; `0` when it must not be held.
 *
 * @remarks
 * Used by the server-side API client so each endpoint decides its own lifetime.
 * The backend already states it per route, so nothing has to be listed twice.
 *
 * `private` counts as not cacheable. The cache reading this is shared by every
 * visitor of the server, which is exactly what that directive rules out, so
 * respecting it keeps anything visitor-specific from leaking between renders.
 * `no-cache` means revalidate before reuse, which this cache cannot do, so it is
 * treated the same way.
 */
export function cacheableSeconds(cacheControl: string | null | undefined): number {
  if (!cacheControl) return 0;

  const value = cacheControl.toLowerCase();
  if (value.includes("no-store") || value.includes("no-cache") || value.includes("private")) {
    return 0;
  }

  const maxAge = value.match(/(?:^|,)\s*max-age=(\d+)/);
  return maxAge ? Number(maxAge[1]) : 0;
}
