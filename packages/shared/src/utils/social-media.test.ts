import { describe, expect, it } from "vitest";

import {
  classifyProfileLink,
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

describe("Pixelfed social media support", () => {
  it.each([
    ["https://pixel.tchncs.de/hdvalentin", "https://pixel.tchncs.de/hdvalentin"],
    ["https://pixel.tchncs.de/hdvalentin/", "https://pixel.tchncs.de/hdvalentin"],
    ["https://pixel.tchncs.de/@hdvalentin", "https://pixel.tchncs.de/hdvalentin"],
    ["https://www.pixel.tchncs.de/hdvalentin", "https://pixel.tchncs.de/hdvalentin"],
    ["hdvalentin@pixel.tchncs.de", "https://pixel.tchncs.de/hdvalentin"],
    ["@hdvalentin@pixel.tchncs.de", "https://pixel.tchncs.de/hdvalentin"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("pixelfed", input)).toBe(expected);
  });

  it.each(["https://pixel.tchncs.de/a/b", "https://pixel.tchncs.de/", "hdvalentin"])(
    "refuses %s, which is no profile",
    (input) => {
      expect(normalizeSocialMediaValue("pixelfed", input)).toBeNull();
    },
  );

  it("is not guessed from an address, because the address does not say", () => {
    // An instance is hosted by whoever runs it and a profile is a single path
    // segment, which is what a personal website looks like as well. Somebody
    // has to say that this is Pixelfed.
    expect(detectPlatformFromUrl("https://pixel.tchncs.de/hdvalentin")).toBeNull();
    expect(classifyProfileLink("https://pixel.tchncs.de/hdvalentin")).toEqual({
      platform: "website",
      url: "https://pixel.tchncs.de/hdvalentin",
    });
  });
});

describe("XING social media support", () => {
  it.each([
    "https://www.xing.com/profile/Kai_Becker",
    "https://xing.com/profile/Kai_Becker",
    "https://www.xing.com/pages/eine-firma",
  ])("detects XING URLs from %s", (url) => {
    expect(detectPlatformFromUrl(url)).toBe("xing");
  });

  it.each([
    ["https://www.xing.com/profile/Kai_Becker", "https://xing.com/profile/Kai_Becker"],
    ["https://www.xing.com/profile/Kai_Becker/", "https://xing.com/profile/Kai_Becker"],
    ["https://xing.com/pages/eine-firma", "https://xing.com/pages/eine-firma"],
    ["https://xing.com/Kai_Becker", "https://xing.com/profile/Kai_Becker"],
    ["Kai_Becker", "https://xing.com/profile/Kai_Becker"],
    ["@Kai_Becker", "https://xing.com/profile/Kai_Becker"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("xing", input)).toBe(expected);
  });

  it("refuses an address on another host", () => {
    expect(normalizeSocialMediaValue("xing", "https://linkedin.com/in/foo")).toBeNull();
  });

  it("sorts a XING profile into XING rather than into a website", () => {
    expect(classifyProfileLink("https://www.xing.com/profile/Kai_Becker")).toEqual({
      platform: "xing",
      url: "https://xing.com/profile/Kai_Becker",
    });
  });
});

describe("classifyProfileLink without a scheme", () => {
  it.each([
    ["xing.com/profile/Kai_Becker", "xing", "https://xing.com/profile/Kai_Becker"],
    ["www.xing.com/profile/Kai_Becker", "xing", "https://xing.com/profile/Kai_Becker"],
    ["linkedin.com/in/jemand", "linkedin", "https://linkedin.com/in/jemand"],
    ["instagram.com/jemand", "instagram", "https://instagram.com/jemand"],
    ["chaos.social/@kim", "mastodon", "https://chaos.social/@kim"],
  ])("sorts %s", (input, platform, url) => {
    expect(classifyProfileLink(input)).toEqual({ platform, url });
  });

  it("still reads a bare domain as a website", () => {
    expect(classifyProfileLink("example.com")).toEqual({
      platform: "website",
      url: "https://example.com/",
    });
  });

  it("still refuses a bare word, which is neither a host nor a handle here", () => {
    expect(classifyProfileLink("foo")).toBeNull();
  });

  it("still reads a fediverse handle", () => {
    expect(classifyProfileLink("@kim@chaos.social")).toEqual({
      platform: "mastodon",
      url: "https://chaos.social/@kim",
    });
  });
});

describe("classifyProfileLink", () => {
  it("sorts an address into the service it belongs to", () => {
    expect(classifyProfileLink("https://oldbytes.space/@phranck")).toEqual({
      platform: "mastodon",
      url: "https://oldbytes.space/@phranck",
    });
    expect(classifyProfileLink("https://github.com/phranck")).toEqual({
      platform: "github",
      url: "https://github.com/phranck",
    });
  });

  it("drops the parts of an address that are not the address", () => {
    expect(classifyProfileLink("https://www.instagram.com/lmaa")).toEqual({
      platform: "instagram",
      url: "https://instagram.com/lmaa",
    });
  });

  it("treats anything on no known service as a website", () => {
    expect(classifyProfileLink("https://layered.work")?.platform).toBe("website");
    expect(classifyProfileLink("layered.work")?.platform).toBe("website");
  });

  it("adds the scheme somebody left out", () => {
    expect(classifyProfileLink("github.com/phranck")).toEqual({
      platform: "github",
      url: "https://github.com/phranck",
    });
  });

  it("reads a fediverse handle as the address it is", () => {
    // Written without a scheme, so putting one in front turns everything before
    // the second `@` into a user on the instance's host.
    expect(classifyProfileLink("@kim@chaos.social")).toEqual({
      platform: "mastodon",
      url: "https://chaos.social/@kim",
    });
    expect(classifyProfileLink("kim@chaos.social")).toEqual({
      platform: "mastodon",
      url: "https://chaos.social/@kim",
    });
  });

  it("gives nothing for what is not an address", () => {
    for (const input of ["", "   ", "not an address at all"]) {
      expect(classifyProfileLink(input)).toBeNull();
    }
  });

  it("refuses a scheme that reaches no page", () => {
    for (const input of ["ftp://x.test", "javascript:alert(1)", "mailto:kim@example.test"]) {
      expect(classifyProfileLink(input)).toBeNull();
    }
  });

  it("refuses an address carrying a user in front of the host", () => {
    // The shape that reads as one host and resolves to another.
    expect(classifyProfileLink("https://layered.work@example.test")).toBeNull();
  });

  it("refuses a single word, which names no host", () => {
    expect(classifyProfileLink("kim")).toBeNull();
  });
});
