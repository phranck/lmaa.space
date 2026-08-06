import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordBackgroundError = vi.fn();

interface EnvOverride {
  SMTP2GO_API_KEY?: string;
}

async function loadEmailModule(overrides: EnvOverride = {}) {
  vi.resetModules();

  vi.doMock("../config/env.js", () => ({
    env: {
      NODE_ENV: "test",
      EMAIL_FROM: "hallo@lmaa.space",
      SMTP2GO_API_KEY: "test-key",
      LOG_LEVEL: "silent",
      ...overrides,
    },
  }));

  vi.doMock("../lib/logger.js", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }));

  vi.doMock("../services/background-errors.js", () => ({ recordBackgroundError }));

  return import("../services/email.js");
}

function stubFetch(response: { ok: boolean; status: number; json: unknown }) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.json),
    text: () => Promise.resolve(JSON.stringify(response.json)),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("sendMail (SMTP2GO)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("posts to the SMTP2GO EU endpoint with the expected payload and returns true", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 1, failed: 0, email_id: "abc" } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("user@example.com", "Hi", "<p>Body</p>", {
      replyTo: "reply@example.com",
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://eu-api.smtp2go.com/v3/email/send");
    expect((init.headers as Record<string, string>)["X-Smtp2go-Api-Key"]).toBe("test-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      sender: "hallo@lmaa.space",
      to: ["user@example.com"],
      subject: "Hi",
      html_body: "<p>Body</p>",
      custom_headers: [{ header: "Reply-To", value: "reply@example.com" }],
    });
    expect(recordBackgroundError).not.toHaveBeenCalled();
  });

  it("records a background error and returns false on an HTTP error", async () => {
    stubFetch({
      ok: false,
      status: 401,
      json: { data: { error: "Bad key", error_code: "E_UNAUTH" } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("user@example.com", "Hi", "<p>x</p>");

    expect(result).toBe(false);
    expect(recordBackgroundError).toHaveBeenCalledWith(
      "email",
      { name: "E_UNAUTH", message: "Bad key", status: 401 },
      { to: "user@example.com", subject: "Hi" },
    );
  });

  it("records a background error when an HTTP 200 reports no delivery", async () => {
    stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 0, failed: 1, error: "Invalid to", error_code: "E_INVALID" } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("user@example.com", "Hi", "<p>x</p>");

    expect(result).toBe(false);
    expect(recordBackgroundError).toHaveBeenCalledWith(
      "email",
      { name: "E_INVALID", message: "Invalid to", status: 200 },
      { to: "user@example.com", subject: "Hi" },
    );
  });

  it("skips an empty/invalid recipient without calling the provider", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 1, failed: 0 } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("", "Hi", "<p>x</p>");

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordBackgroundError).not.toHaveBeenCalled();
  });

  it("drops an invalid Reply-To but still sends the message", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 1, failed: 0 } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("user@example.com", "Hi", "<p>x</p>", {
      replyTo: "attacker@example.com\r\nBcc: victim@example.com",
    });

    expect(result).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("custom_headers");
  });

  it("refuses a recipient carrying a header break without contacting the provider", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 1, failed: 0 } },
    });
    const { sendMail } = await loadEmailModule();

    const result = await sendMail("user@example.com\r\nBcc: victim@example.com", "Hi", "<p>x</p>");

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordBackgroundError).not.toHaveBeenCalled();
  });

  it("skips sending when SMTP2GO_API_KEY is not set", async () => {
    const fetchMock = stubFetch({
      ok: true,
      status: 200,
      json: { data: { succeeded: 1, failed: 0 } },
    });
    const { sendMail } = await loadEmailModule({ SMTP2GO_API_KEY: undefined });

    const result = await sendMail("user@example.com", "Hi", "<p>x</p>");

    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
