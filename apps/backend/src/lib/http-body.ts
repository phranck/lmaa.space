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
 * Reads only the leading bytes needed to identify a streamed resource.
 *
 * @param response - Response whose prefix should be consumed.
 * @param maxBytes - Number of leading bytes to retain.
 * @returns The available prefix, which may be shorter when the body ends.
 *
 * @remarks
 * Unlike {@link readBodyWithLimit}, this deliberately ignores `Content-Length`
 * and does not require the complete body to fit. It cancels the stream after
 * enough bytes were retained, so a large image is not rejected merely for its
 * total file size while memory use remains bounded.
 */
export async function readBodyPrefix(response: Response, maxBytes: number): Promise<Uint8Array> {
  const body = response.body;
  if (!body) return new Uint8Array();

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let ended = false;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) {
        ended = true;
        break;
      }
      if (!value) continue;

      const remaining = maxBytes - total;
      const kept = value.subarray(0, Math.min(value.byteLength, remaining));
      chunks.push(kept);
      total += kept.byteLength;
    }
    if (!ended) await reader.cancel();
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
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
 * Reads as much of a body as the budget allows, and keeps it.
 *
 * The deliberate opposite of `readTextWithLimit`, for the one caller whose
 * reading survives a torso: a document scanned for tags rather than parsed as a
 * whole. Everything such a scan looks for sits in the head, so a page a few
 * kilobytes over budget still answers every question, whereas discarding it
 * answers none. A declared length is ignored for the same reason.
 *
 * Never use this where the result is parsed. A half a JSON document is not a
 * smaller document, it is a broken one.
 *
 * @param response - The response to read.
 * @param maxBytes - How much to keep.
 * @returns The prefix as text. Slightly longer than the budget where a chunk
 *   straddles it, since chunks arrive whole.
 */
export async function readTextPrefix(response: Response, maxBytes: number): Promise<string> {
  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      chunks.push(value);
      total += value.byteLength;
      if (total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // Decoded past the budget rather than cut to it, because cutting mid-sequence
  // would corrupt the last character. The few extra bytes cost nothing.
  return new TextDecoder().decode(out);
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
