/**
 * Reads a response body but stops once a byte budget is exceeded.
 *
 * @param response - Response whose body should be consumed.
 * @param maxBytes - Largest number of bytes to accept.
 * @returns The bytes read, or `null` when the body is larger than `maxBytes`.
 *
 * @remarks
 * `text()`, `json()` and `arrayBuffer()` buffer the whole body, so a server
 * that keeps sending decides how much memory this process uses. Reading the
 * stream in chunks and cancelling past the budget bounds that.
 *
 * A `Content-Length` above the budget short-circuits the read. The header is
 * only a hint, because it may be absent under chunked encoding and may
 * understate the real size, so the running total is what actually enforces the
 * limit.
 *
 * Oversized bodies return `null` rather than the truncated prefix: every caller
 * here parses what it reads, and a partial document would either fail to parse
 * or, worse, parse into something misleading.
 */
export async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return null;

  const body = response.body;
  if (!body) return new Uint8Array(new ArrayBuffer(0));

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Reads a response body as UTF-8 text under a byte budget.
 *
 * @param response - Response whose body should be consumed.
 * @param maxBytes - Largest number of bytes to accept.
 * @returns The decoded text, or `null` when the body exceeds `maxBytes`.
 */
export async function readTextWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const bytes = await readBodyWithLimit(response, maxBytes);
  return bytes === null ? null : new TextDecoder().decode(bytes);
}

/**
 * Reads and parses a JSON response body under a byte budget.
 *
 * @param response - Response whose body should be consumed.
 * @param maxBytes - Largest number of bytes to accept.
 * @returns The parsed value, or `null` when the body exceeds `maxBytes` or is not valid JSON.
 */
export async function readJsonWithLimit<T>(
  response: Response,
  maxBytes: number,
): Promise<T | null> {
  const text = await readTextWithLimit(response, maxBytes);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
