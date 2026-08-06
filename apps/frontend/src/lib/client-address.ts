/**
 * Builds the `X-Forwarded-For` value to send to the backend for a proxied request.
 *
 * @param incomingForwardedFor - The `X-Forwarded-For` header of the incoming request, if any.
 * @param socketAddress - Address of the immediate peer, used only when no header is present.
 * @returns The header value to forward, or `null` when no address is available.
 *
 * @remarks
 * An existing header is passed through unchanged rather than appended to. The
 * edge proxy appends the address it observed as the right-most entry, and the
 * backend reads exactly that entry (`TRUST_PROXY_HOPS`). Adding another hop
 * here would shift that position, so the backend would read the edge proxy
 * instead of the visitor. Entries further left come from the caller and travel
 * along without being trusted, which is the same situation the backend already
 * handles for requests that reach it directly.
 *
 * The socket address is used only when no header exists, because then nothing
 * sat in front of this server and the peer really is the visitor.
 */
export function buildForwardedForHeader(
  incomingForwardedFor: string | null | undefined,
  socketAddress: string | null | undefined,
): string | null {
  const forwarded = incomingForwardedFor?.trim();
  if (forwarded) return forwarded;

  const socket = socketAddress?.trim();
  return socket ? socket : null;
}
