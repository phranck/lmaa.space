import { describe, expect, it } from "vitest";

import {
  detectPlatformFromUrl,
  normalizeSocialMediaValue,
  socialMediaSchema,
  SOCIAL_PLATFORM_KEYS,
} from "./social-media.js";

describe("Discord social media support", () => {
  it("exposes Discord as a supported social platform", () => {
    expect(SOCIAL_PLATFORM_KEYS).toContain("discord");
  });

  it.each([
    "https://discord.gg/lmaa",
    "discord.gg/lmaa",
    "https://discord.com/invite/lmaa",
    "https://discordapp.com/invite/lmaa",
    "https://discord.com/users/1234567890",
  ])("detects Discord URLs from %s", (url) => {
    expect(detectPlatformFromUrl(url)).toBe("discord");
  });

  it.each([
    ["https://discord.gg/lmaa", "https://discord.gg/lmaa"],
    ["discord.gg/lmaa", "https://discord.gg/lmaa"],
    ["https://discord.com/invite/lmaa", "https://discord.gg/lmaa"],
    ["https://discordapp.com/invite/lmaa", "https://discord.gg/lmaa"],
    ["lmaa", "https://discord.gg/lmaa"],
    ["https://discord.com/users/1234567890", "https://discord.com/users/1234567890"],
    [
      "https://discord.com/channels/1234567890/987654321",
      "https://discord.com/channels/1234567890/987654321",
    ],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("discord", input)).toBe(expected);
  });

  it("normalizes Discord links through the social media schema", () => {
    expect(socialMediaSchema.parse({ discord: "discord.com/invite/lmaa" })).toEqual({
      discord: "https://discord.gg/lmaa",
    });
  });
});

describe("Tumblr social media support", () => {
  it.each([
    "https://moertel.tumblr.com",
    "https://www.tumblr.com/moertel",
    "https://moertel.tumblr.com/post/123",
    "https://tumblr.com/moertel",
  ])("detects Tumblr URLs from %s", (url) => {
    expect(detectPlatformFromUrl(url)).toBe("tumblr");
  });

  it.each([
    ["https://moertel.tumblr.com", "https://moertel.tumblr.com"],
    ["https://moertel.tumblr.com/", "https://moertel.tumblr.com"],
    ["https://www.moertel.tumblr.com", "https://moertel.tumblr.com"],
    ["https://www.tumblr.com/moertel", "https://moertel.tumblr.com"],
    ["https://tumblr.com/moertel", "https://moertel.tumblr.com"],
    ["https://tumblr.com/moertel/", "https://moertel.tumblr.com"],
    ["moertel", "https://moertel.tumblr.com"],
    ["@moertel", "https://moertel.tumblr.com"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("tumblr", input)).toBe(expected);
  });

  it.each(["https://example.com/moertel", "https://tumblr.com/", "moertel.tumblr.com"])(
    "rejects invalid Tumblr input %s",
    (input) => {
      expect(normalizeSocialMediaValue("tumblr", input)).toBeNull();
    },
  );

  it("normalizes Tumblr links through the social media schema", () => {
    expect(socialMediaSchema.parse({ tumblr: "https://moertel.tumblr.com" })).toEqual({
      tumblr: "https://moertel.tumblr.com",
    });
  });
});

describe("LinkedIn social media support", () => {
  it.each([
    "https://linkedin.com/in/foo",
    "https://www.linkedin.com/company/bar",
    "https://linkedin.com/stefaniegrunwald",
  ])("detects LinkedIn URLs from %s", (url) => {
    expect(detectPlatformFromUrl(url)).toBe("linkedin");
  });

  it.each([
    ["https://linkedin.com/in/foo", "https://linkedin.com/in/foo"],
    ["https://www.linkedin.com/in/foo/", "https://linkedin.com/in/foo"],
    ["https://linkedin.com/company/bar", "https://linkedin.com/company/bar"],
    ["https://linkedin.com/stefaniegrunwald", "https://linkedin.com/in/stefaniegrunwald"],
    ["https://www.linkedin.com/stefaniegrunwald/", "https://linkedin.com/in/stefaniegrunwald"],
    ["foo", "https://linkedin.com/in/foo"],
    ["@foo", "https://linkedin.com/in/foo"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("linkedin", input)).toBe(expected);
  });

  it.each([
    "https://linkedin.com/groups",
    "https://linkedin.com/jobs",
    "https://linkedin.com/feed",
    "https://linkedin.com/learning",
    "https://linkedin.com/pulse",
  ])("rejects reserved LinkedIn top-level path %s", (input) => {
    expect(normalizeSocialMediaValue("linkedin", input)).toBeNull();
  });

  it("normalizes LinkedIn vanity URLs through the social media schema", () => {
    expect(socialMediaSchema.parse({ linkedin: "https://linkedin.com/stefaniegrunwald" })).toEqual({
      linkedin: "https://linkedin.com/in/stefaniegrunwald",
    });
  });
});
