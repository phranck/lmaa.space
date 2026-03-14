import { beforeEach, describe, expect, it, vi } from "vitest";

const repoMocks = vi.hoisted(() => ({
  findShopByDomain: vi.fn(),
  findRejectedSubmissionByDomain: vi.fn(),
}));

vi.mock("../repositories/public.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../repositories/public.js")>();
  return { ...actual, ...repoMocks };
});

import { validateShopUrl } from "../services/public.js";

describe("validateShopUrl", () => {
  beforeEach(() => {
    repoMocks.findShopByDomain.mockReset();
    repoMocks.findRejectedSubmissionByDomain.mockReset();
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

  it("returns available when no matching shop or submission exists", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);

    const result = await validateShopUrl("https://new-shop.de");
    expect(result).toEqual({ status: "available" });
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("new-shop.de");
    expect(repoMocks.findRejectedSubmissionByDomain).toHaveBeenCalledWith("new-shop.de");
  });

  it("returns published when shop is public", async () => {
    repoMocks.findShopByDomain.mockResolvedValue({
      id: 1,
      name: "Fair Fashion Store",
      url: "https://fairfashion.de",
      visibility: "public",
      rejectionToken: null,
    });

    const result = await validateShopUrl("https://www.fairfashion.de/about");
    expect(result).toEqual({ status: "published", shopName: "Fair Fashion Store" });
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

    await validateShopUrl("https://shop.store.example.com/path?q=1");
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("example.com");
  });

  it("trims whitespace from input", async () => {
    repoMocks.findShopByDomain.mockResolvedValue(null);
    repoMocks.findRejectedSubmissionByDomain.mockResolvedValue(null);

    await validateShopUrl("  https://example.de  ");
    expect(repoMocks.findShopByDomain).toHaveBeenCalledWith("example.de");
  });
});
