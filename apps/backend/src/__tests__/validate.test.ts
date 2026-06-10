import { describe, expect, it } from "vitest";

import {
  detectImageType,
  isExternalUrl,
  isPrivateIp,
  isPublicFetchTarget,
  parseId,
} from "../lib/validate.js";

describe("parseId", () => {
  it("returns number for valid positive integer", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
    expect(parseId("999999")).toBe(999999);
  });

  it("returns null for zero", () => {
    expect(parseId("0")).toBeNull();
  });

  it("returns null for negative numbers", () => {
    expect(parseId("-1")).toBeNull();
    expect(parseId("-100")).toBeNull();
  });

  it("returns null for floats", () => {
    expect(parseId("1.5")).toBeNull();
    expect(parseId("0.1")).toBeNull();
  });

  it("returns null for non-numeric strings", () => {
    expect(parseId("abc")).toBeNull();
    expect(parseId("")).toBeNull();
    expect(parseId("1abc")).toBeNull();
  });

  it("returns null for special values", () => {
    expect(parseId("NaN")).toBeNull();
    expect(parseId("Infinity")).toBeNull();
  });
});

describe("detectImageType", () => {
  it("detects JPEG by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0xff;
    buf[1] = 0xd8;
    expect(detectImageType(buf)).toBe("jpeg");
  });

  it("detects PNG by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x89;
    buf[1] = 0x50;
    buf[2] = 0x4e;
    buf[3] = 0x47;
    expect(detectImageType(buf)).toBe("png");
  });

  it("detects WebP by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x52; // R
    buf[1] = 0x49; // I
    buf[2] = 0x46; // F
    buf[3] = 0x46; // F
    buf[8] = 0x57; // W
    buf[9] = 0x45; // E
    buf[10] = 0x42; // B
    buf[11] = 0x50; // P
    expect(detectImageType(buf)).toBe("webp");
  });

  it("detects GIF by magic bytes", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x47; // G
    buf[1] = 0x49; // I
    buf[2] = 0x46; // F
    buf[3] = 0x38; // 8
    expect(detectImageType(buf)).toBe("gif");
  });

  it("detects AVIF by magic bytes (avif brand)", () => {
    const buf = Buffer.alloc(12);
    buf[4] = 0x66; // f
    buf[5] = 0x74; // t
    buf[6] = 0x79; // y
    buf[7] = 0x70; // p
    buf[8] = 0x61; // a
    buf[9] = 0x76; // v
    buf[10] = 0x69; // i
    buf[11] = 0x66; // f
    expect(detectImageType(buf)).toBe("avif");
  });

  it("detects AVIF by magic bytes (avis brand)", () => {
    const buf = Buffer.alloc(12);
    buf[4] = 0x66; // f
    buf[5] = 0x74; // t
    buf[6] = 0x79; // y
    buf[7] = 0x70; // p
    buf[8] = 0x61; // a
    buf[9] = 0x76; // v
    buf[10] = 0x69; // i
    buf[11] = 0x73; // s
    expect(detectImageType(buf)).toBe("avif");
  });

  it("returns null for unknown format", () => {
    const buf = Buffer.alloc(12, 0x00);
    expect(detectImageType(buf)).toBeNull();
  });

  it("returns null for buffer too small", () => {
    const buf = Buffer.alloc(4);
    expect(detectImageType(buf)).toBeNull();
  });

  it("returns null for ftyp box with unknown brand", () => {
    const buf = Buffer.alloc(12);
    buf[4] = 0x66; // f
    buf[5] = 0x74; // t
    buf[6] = 0x79; // y
    buf[7] = 0x70; // p
    buf[8] = 0x69; // i
    buf[9] = 0x73; // s
    buf[10] = 0x6f; // o
    buf[11] = 0x6d; // m ("isom")
    expect(detectImageType(buf)).toBeNull();
  });
});

describe("isExternalUrl", () => {
  it("accepts valid external https URL", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
  });

  it("accepts valid external http URL", () => {
    expect(isExternalUrl("http://shop.de/path")).toBe(true);
  });

  it("rejects ftp protocol", () => {
    expect(isExternalUrl("ftp://files.example.com")).toBe(false);
  });

  it("rejects javascript protocol", () => {
    expect(isExternalUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects localhost", () => {
    expect(isExternalUrl("http://localhost")).toBe(false);
    expect(isExternalUrl("http://localhost:3000")).toBe(false);
  });

  it("rejects 127.0.0.1", () => {
    expect(isExternalUrl("http://127.0.0.1")).toBe(false);
  });

  it("rejects IPv6 loopback", () => {
    expect(isExternalUrl("http://[::1]")).toBe(false);
  });

  it("rejects 0.0.0.0", () => {
    expect(isExternalUrl("http://0.0.0.0")).toBe(false);
  });

  it("rejects private 10.x.x.x range", () => {
    expect(isExternalUrl("http://10.0.0.1")).toBe(false);
    expect(isExternalUrl("http://10.255.255.255")).toBe(false);
  });

  it("rejects private 172.16-31.x.x range", () => {
    expect(isExternalUrl("http://172.16.0.1")).toBe(false);
    expect(isExternalUrl("http://172.31.255.255")).toBe(false);
  });

  it("accepts public 172.x outside private range", () => {
    expect(isExternalUrl("http://172.15.0.1")).toBe(true);
    expect(isExternalUrl("http://172.32.0.1")).toBe(true);
  });

  it("rejects private 192.168.x.x range", () => {
    expect(isExternalUrl("http://192.168.0.1")).toBe(false);
    expect(isExternalUrl("http://192.168.1.100")).toBe(false);
  });

  it("rejects link-local 169.254.x.x range", () => {
    expect(isExternalUrl("http://169.254.169.254")).toBe(false);
  });

  it("rejects IPv6 ULA (fc/fd) addresses", () => {
    expect(isExternalUrl("http://[fc00::1]")).toBe(false);
    expect(isExternalUrl("http://[fd12:3456::1]")).toBe(false);
  });

  it("rejects IPv6 link-local (fe80) addresses", () => {
    expect(isExternalUrl("http://[fe80::1]")).toBe(false);
  });

  it("rejects .internal hostnames", () => {
    expect(isExternalUrl("http://api.internal")).toBe(false);
  });

  it("rejects .local hostnames", () => {
    expect(isExternalUrl("http://printer.local")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isExternalUrl("not a url")).toBe(false);
    expect(isExternalUrl("")).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("flags loopback, private, link-local, CGNAT and reserved IPv4 ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "0.0.0.0",
      "100.64.0.1",
    ]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("allows public IPv4 addresses", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.15.0.1", "172.32.0.1"]) {
      expect(isPrivateIp(ip)).toBe(false);
    }
  });

  it("unwraps IPv4-mapped IPv6 and flags the inner private address", () => {
    expect(isPrivateIp("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("blocks hex-normalized IPv4-mapped IPv6, NAT64 and 6to4 (SSRF bypass regression)", () => {
    // WHATWG `new URL("http://[::ffff:127.0.0.1]/").hostname` === "::ffff:7f00:1"
    expect(isPrivateIp("::ffff:7f00:1")).toBe(true); // 127.0.0.1
    expect(isPrivateIp("::ffff:a9fe:a9fe")).toBe(true); // 169.254.169.254 (cloud metadata)
    expect(isPrivateIp("::ffff:c0a8:1")).toBe(true); // 192.168.0.1
    expect(isPrivateIp("::ffff:808:808")).toBe(false); // 8.8.8.8 (public)
    expect(isPrivateIp("64:ff9b::7f00:1")).toBe(true); // NAT64 127.0.0.1
    expect(isPrivateIp("2002::1")).toBe(true); // 6to4
  });

  it("flags IPv6 loopback, unspecified, ULA and link-local", () => {
    for (const ip of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("fails closed for non-IP input", () => {
    expect(isPrivateIp("not-an-ip")).toBe(true);
    expect(isPrivateIp("example.com")).toBe(true);
  });
});

describe("isPublicFetchTarget", () => {
  it("rejects non-http(s) schemes", async () => {
    expect(await isPublicFetchTarget("javascript:alert(1)")).toBe(false);
    expect(await isPublicFetchTarget("ftp://example.com")).toBe(false);
  });

  it("rejects http targets when httpsOnly is set", async () => {
    expect(await isPublicFetchTarget("http://93.184.216.34", { httpsOnly: true })).toBe(false);
  });

  it("rejects private and reserved IP literals", async () => {
    expect(await isPublicFetchTarget("http://127.0.0.1")).toBe(false);
    expect(await isPublicFetchTarget("http://169.254.169.254")).toBe(false);
    expect(await isPublicFetchTarget("http://[::1]")).toBe(false);
  });

  it("accepts public IP literals", async () => {
    expect(await isPublicFetchTarget("https://93.184.216.34")).toBe(true);
    expect(await isPublicFetchTarget("https://8.8.8.8", { httpsOnly: true })).toBe(true);
  });

  it("blocks hex IPv4-mapped IPv6 literals end-to-end (SSRF guard regression)", async () => {
    expect(await isPublicFetchTarget("http://[::ffff:7f00:1]/")).toBe(false); // 127.0.0.1
    expect(await isPublicFetchTarget("http://[::ffff:a9fe:a9fe]/")).toBe(false); // 169.254.169.254
    expect(await isPublicFetchTarget("https://[::ffff:7f00:1]/", { httpsOnly: true })).toBe(false);
  });
});
