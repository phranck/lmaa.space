import { describe, expect, it } from "vitest";

import { hashIp, normalizeShopHostname } from "../services/public.js";

describe("normalizeShopHostname", () => {
  it("extracts domain from full URL", () => {
    expect(normalizeShopHostname("https://example.com/path")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(normalizeShopHostname("https://www.example.com")).toBe("example.com");
  });

  it("handles URL without protocol", () => {
    expect(normalizeShopHostname("example.com")).toBe("example.com");
  });

  it("handles URL with http protocol", () => {
    expect(normalizeShopHostname("http://shop.de")).toBe("shop.de");
  });

  it("extracts DOMAIN.TLD from subdomain URLs", () => {
    expect(normalizeShopHostname("https://shop.example.com")).toBe("example.com");
  });

  it("handles multi-part TLDs like .co.uk", () => {
    expect(normalizeShopHostname("https://www.shop.example.co.uk")).toBe("example.co.uk");
  });

  it("returns null for invalid URL", () => {
    expect(normalizeShopHostname("not a url at all :::")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeShopHostname("")).toBeNull();
  });
});

describe("hashIp", () => {
  it("returns a hex string", () => {
    const hash = hashIp("192.168.1.1");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces consistent hashes for same input", () => {
    expect(hashIp("10.0.0.1")).toBe(hashIp("10.0.0.1"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("10.0.0.1")).not.toBe(hashIp("10.0.0.2"));
  });
});
