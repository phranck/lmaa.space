import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HttpError, fail, getErrorResponse, ok, respondError } from "../lib/http.js";

describe("HttpError", () => {
  it("stores status, message, and code", () => {
    const err = new HttpError(404, "Not found", "NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("HttpError");
  });

  it("works without code", () => {
    const err = new HttpError(400, "Bad request");
    expect(err.code).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const err = new HttpError(500, "fail");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("getErrorResponse", () => {
  it("handles HttpError with code", () => {
    const err = new HttpError(422, "Validation failed", "VALIDATION");
    const result = getErrorResponse(err);
    expect(result.status).toBe(422);
    expect(result.error).toEqual({ message: "Validation failed", code: "VALIDATION" });
  });

  it("handles HttpError without code", () => {
    const err = new HttpError(403, "Forbidden");
    const result = getErrorResponse(err);
    expect(result.status).toBe(403);
    expect(result.error).toEqual({ message: "Forbidden" });
  });

  it("handles generic Error in development", () => {
    const result = getErrorResponse(new Error("something broke"));
    expect(result.status).toBe(500);
    expect(result.error.message).toBe("something broke");
  });

  it("handles non-Error values", () => {
    const result = getErrorResponse("unknown");
    expect(result.status).toBe(500);
    expect(result.error.message).toBe("Internal Server Error");
  });

  it("handles null", () => {
    const result = getErrorResponse(null);
    expect(result.status).toBe(500);
    expect(result.error.message).toBe("Internal Server Error");
  });
});

describe("ok/fail helpers", () => {
  const app = new Hono();
  app.get("/ok", (c) => ok(c, { id: 1 }));
  app.get("/ok-201", (c) => ok(c, { created: true }, 201));
  app.get("/fail", (c) => fail(c, 400, "Bad request"));
  app.get("/fail-code", (c) => fail(c, 409, "Conflict", "DUPLICATE"));
  app.get("/respond-error", (c) => respondError(c, new HttpError(404, "Not found")));

  it("ok returns { data } with status 200", async () => {
    const res = await app.request("/ok");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: 1 } });
  });

  it("ok supports custom status code", async () => {
    const res = await app.request("/ok-201");
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { created: true } });
  });

  it("fail returns { error } with message", async () => {
    const res = await app.request("/fail");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { message: "Bad request" } });
  });

  it("fail supports error code", async () => {
    const res = await app.request("/fail-code");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: { message: "Conflict", code: "DUPLICATE" } });
  });

  it("respondError writes normalized error response", async () => {
    const res = await app.request("/respond-error");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { message: "Not found" } });
  });
});
