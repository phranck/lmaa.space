import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findShopByDomain: vi.fn(),
  findRejectedSubmissionByDomain: vi.fn(),
  findPendingSubmissionByDomain: vi.fn(),
}));

const appSettingsMocks = vi.hoisted(() => ({
  getSetting: vi.fn(),
}));

vi.mock("../repositories/public.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../repositories/public.js")>();
  return { ...actual, ...repoMocks };
});
vi.mock("../repositories/app-settings.js", () => appSettingsMocks);

import { validateShopUrl } from "../services/public.js";

const DOMAIN_ALERT_MESSAGE =
  "Da hatte wohl jemand bereits die gleiche Idee! Der Shop [Amazon](https://www.youtube.com/watch?v=dQw4w9WgXcQ) ist schon eingetragen.";

function mockDomainAlertRules(isActive = true) {
  appSettingsMocks.getSetting.mockResolvedValue(
    JSON.stringify({
      rules: [
        {
          id: "amazon-rickroll",
          name: "Amazon URLs",
          domainsText: "amazon.de, amazon.com, amzn.to",
          messageMarkdown: DOMAIN_ALERT_MESSAGE,
          isActive,
        },
      ],
    }),
  );
}

describe("validateShopUrl", () => {
  beforeEach(() => {
    repoMocks.findShopByDomain.mockReset();
    repoMocks.findRejectedSubmissionByDomain.mockReset();
    repoMocks.findPendingSubmissionByDomain.mockReset();
    appSettingsMocks.getSetting.mockReset();
    appSettingsMocks.getSetting.mockResolvedValue(null);
  });

  it("returns available for undefined input", async () => {
    const result = await validateShopUrl(undefined);
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns available for empty string", async () => {
    const result = await validateShopUrl("");
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns available for whitespace-only input", async () => {
    const result = await validateShopUrl("   ");
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns invalid for URL without TLD", async () => {
    const result = await validateShopUrl("https://lrlrl");
    expect(result).toEqual({ status: "invalid" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns invalid for localhost", async () => {
    const result = await validateShopUrl("https://localhost");
    expect(result).toEqual({ status: "invalid" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns invalid for raw IP address", async () => {
    const result = await validateShopUrl("https://192.168.1.1");
    expect(result).toEqual({ status: "invalid" });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
  });

  it("returns available when no matching shop or submission exists", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockResolvedValue(null);

    const result = await validateShopUrl("https://new-shop.de");
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("new-shop.de");
    expect(repoMocks.findRejectedSubmissionByDomain).toHaveBeenCalledWith("new-shop.de");
    expect(repoMocks.findPendingSubmissionByDomain).toHaveBeenCalledWith("new-shop.de");
  });

  it("returns published with detail link when shop is public", async () => {
    repoMocks.findShopByDomain.mockResolvedValue({
      id: 1,
      name: "Fair Fashion Store",
      url: "https://fairfashion.de",
      visibility: "public",
      rejectionToken: null,
    });

    const result = await validateShopUrl("https://www.fairfashion.de/about");
    expect(result).toEqual({
      status: "published",
      shopName: "Fair Fashion Store",
      shopUrl: expect.stringMatching(/^\/shop\/[a-z0-9]+$/),
    });
  });

  it("returns blocked with configured alert for matching domains without DB lookup", async () => {
    mockDomainAlertRules();

    const result = await validateShopUrl("https://www.amazon.de/dp/B000123");
    expect(result).toEqual({
      status: "blocked",
      messageMarkdown: DOMAIN_ALERT_MESSAGE,
    });
    expect(repoMocks.findShopByDomain).not.toHaveBeenCalled();
    expect(repoMocks.findRejectedSubmissionByDomain).not.toHaveBeenCalled();
    expect(repoMocks.findPendingSubmissionByDomain).not.toHaveBeenCalled();
  });

  it("ignores disabled domain alert rules", async () => {
    mockDomainAlertRules(false);
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockResolvedValue(null);

    const result = await validateShopUrl("https://www.amazon.de/dp/B000123");
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("amazon.de");
  });

  it("returns rejected with rejectionUrl when shop was rejected", async () => {
    repoMocks.findShopByDomain.mockResolvedValue({
      id: 2,
      name: "Bad Shop",
      url: "https://badshop.com",
      visibility: "rejected",
      rejectionToken: "abc123def456abc123def456abc12345",
    });

    const result = await validateShopUrl("badshop.com");
    expect(result).toEqual({
      status: "rejected",
      shopName: "Bad Shop",
      rejectionUrl: "/rejected/abc123def456abc123def456abc12345",
    });
  });

  it("returns rejected with null rejectionUrl when token is missing", async () => {
    repoMocks.findShopByDomain.mockResolvedValue({
      id: 3,
      name: "Rejected Shop",
      url: "https://rejected.de",
      visibility: "rejected",
      rejectionToken: null,
    });

    const result = await validateShopUrl("rejected.de");
    expect(result).toEqual({
      status: "rejected",
      shopName: "Rejected Shop",
      rejectionUrl: null,
    });
  });

  it("returns rejected when submission was rejected", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue({
      id: 10,
      shopName: "Rejected Submission",
      shopUrl: "https://rejected-sub.de",
      rejectionToken: "token123",
    });

    const result = await validateShopUrl("https://rejected-sub.de");
    expect(result).toEqual({
      status: "rejected",
      shopName: "Rejected Submission",
      rejectionUrl: "/rejected/token123",
    });
  });

  it("normalizes subdomains to DOMAIN.TLD before lookup", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockResolvedValue(null);

    await validateShopUrl("https://shop.store.example.com/path?q=1");
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("example.com");
  });

  it("trims whitespace from input", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockResolvedValue(null);

    await validateShopUrl("  https://example.de  ");
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("example.de");
  });

  it("returns pending when submission is awaiting moderation", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockResolvedValue({
      id: 42,
      shopName: "Good Karma Coffee",
      shopUrl: "https://goodkarmacoffee.de",
    });

    const result = await validateShopUrl("https://www.goodkarmacoffee.de");
    expect(result).toEqual({ status: "pending", shopName: "Good Karma Coffee" });
    expect(repoMocks.findPendingSubmissionByDomain).toHaveBeenCalledWith("goodkarmacoffee.de");
  });

  it("treats www. and apex forms as the same domain", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);
    repoMocks.findPendingSubmissionByDomain.mockImplementation(async (domain: string) =>
      domain === "goodkarmacoffee.de"
        ? { id: 42, shopName: "Good Karma", shopUrl: "https://goodkarmacoffee.de" }
        : null,
    );

    const apex = await validateShopUrl("https://goodkarmacoffee.de");
    const www = await validateShopUrl("https://www.goodkarmacoffee.de");
    expect(apex.status).toBe("pending");
    expect(www.status).toBe("pending");
  });
});
