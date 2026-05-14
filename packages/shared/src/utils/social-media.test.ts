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
