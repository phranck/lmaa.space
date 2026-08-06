import { describe, expect, it } from "vitest";

import { readBodyWithLimit, readJsonWithLimit, readTextWithLimit } from "../lib/http-body.js";

/** Builds a response whose body streams `chunkCount` chunks of `chunkSize` bytes. */
function streamingResponse(
  chunkCount: number,
  chunkSize: number,
  headers: Record<string, string> = {},
): Response {
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= chunkCount) {
        controller.close();
        return;
      }
      sent++;
      controller.enqueue(new Uint8Array(chunkSize).fill(0x61));
    },
  });
  return new Response(body, { headers });
}

/** Builds a response whose body never ends, as a hostile server would. */
function endlessResponse(): Response {
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(1024).fill(0x61));
    },
  });
  return new Response(body);
}

describe("readBodyWithLimit", () => {
  it("returns the whole body when it fits", async () => {
    const result = await readBodyWithLimit(streamingResponse(4, 256), 4096);
    expect(result).not.toBeNull();
    expect(result?.byteLength).toBe(1024);
  });

  it("returns the body when it exactly meets the budget", async () => {
    const result = await readBodyWithLimit(streamingResponse(4, 256), 1024);
    expect(result?.byteLength).toBe(1024);
  });

  it("returns null once the body passes the budget", async () => {
    const result = await readBodyWithLimit(streamingResponse(4, 256), 1023);
    expect(result).toBeNull();
  });

  // Without a running total this call would never return and would consume
  // memory until the process died.
  it("stops on a body that never ends", async () => {
    const result = await readBodyWithLimit(endlessResponse(), 8 * 1024);
    expect(result).toBeNull();
  });

  it("rejects up front when Content-Length exceeds the budget", async () => {
    const response = streamingResponse(1, 8, { "content-length": "999999" });
    expect(await readBodyWithLimit(response, 1024)).toBeNull();
  });

  it("ignores a Content-Length that understates the real size", async () => {
    // The header is a hint; the running total is what enforces the limit.
    const response = streamingResponse(4, 256, { "content-length": "8" });
    expect(await readBodyWithLimit(response, 512)).toBeNull();
  });

  it("handles an empty body", async () => {
    const result = await readBodyWithLimit(new Response(null), 1024);
    expect(result?.byteLength).toBe(0);
  });

  it("preserves byte order across chunks", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5]));
        controller.close();
      },
    });
    const result = await readBodyWithLimit(new Response(body), 64);
    expect(Array.from(result ?? [])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("readTextWithLimit", () => {
  it("decodes a body that fits", async () => {
    expect(await readTextWithLimit(new Response("hello"), 64)).toBe("hello");
  });

  it("returns null for an oversized body", async () => {
    expect(await readTextWithLimit(streamingResponse(4, 256), 100)).toBeNull();
  });
});

describe("readJsonWithLimit", () => {
  it("parses a body that fits", async () => {
    const response = new Response(JSON.stringify({ icons: [{ src: "a.png" }] }));
    expect(await readJsonWithLimit<{ icons: unknown[] }>(response, 1024)).toEqual({
      icons: [{ src: "a.png" }],
    });
  });

  it("returns null for an oversized body", async () => {
    expect(await readJsonWithLimit(streamingResponse(4, 256), 100)).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", async () => {
    expect(await readJsonWithLimit(new Response("{not json"), 1024)).toBeNull();
  });
});
