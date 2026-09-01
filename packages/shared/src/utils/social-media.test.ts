import { describe, expect, it } from "vitest";

import {
  classifyProfileLink,
  detectPlatformFromUrl,
  detectProfilePlatform,
  findSocialMediaUrl,
  isFediverseHandle,
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
    expect(socialMediaSchema.parse({ discord: "discord.com/invite/lmaa" })).toEqual([
      { platform: "discord", url: "https://discord.gg/lmaa" },
    ]);
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
    expect(socialMediaSchema.parse({ tumblr: "https://moertel.tumblr.com" })).toEqual([
      { platform: "tumblr", url: "https://moertel.tumblr.com" },
    ]);
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
    expect(socialMediaSchema.parse({ linkedin: "https://linkedin.com/stefaniegrunwald" })).toEqual([
      { platform: "linkedin", url: "https://linkedin.com/in/stefaniegrunwald" },
    ]);
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
      url: "https://example.com",
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

describe("several addresses for one platform", () => {
  it("keeps two websites rather than letting the second replace the first", () => {
    expect(
      socialMediaSchema.parse([
        { platform: "website", url: "https://kim.example" },
        { platform: "website", url: "https://blog.kim.example" },
      ]),
    ).toEqual([
      { platform: "website", url: "https://kim.example" },
      { platform: "website", url: "https://blog.kim.example" },
    ]);
  });

  it("keeps the order the addresses were given in", () => {
    expect(
      socialMediaSchema.parse([
        { platform: "website", url: "https://kim.example" },
        { platform: "mastodon", url: "https://chaos.social/@kim" },
      ]),
    ).toEqual([
      { platform: "website", url: "https://kim.example" },
      { platform: "mastodon", url: "https://chaos.social/@kim" },
    ]);
  });

  it("keeps one copy of an address that was given twice", () => {
    expect(
      socialMediaSchema.parse([
        { platform: "website", url: "https://kim.example" },
        { platform: "website", url: "https://kim.example" },
      ]),
    ).toEqual([{ platform: "website", url: "https://kim.example" }]);
  });

  it("still reads the map that rows written before the list still hold", () => {
    expect(
      socialMediaSchema.parse({ mastodon: "https://chaos.social/@kim", website: "kim.example" }),
    ).toEqual([
      { platform: "mastodon", url: "https://chaos.social/@kim" },
      { platform: "website", url: "https://kim.example" },
    ]);
  });

  it("gives nothing when every address was empty", () => {
    expect(socialMediaSchema.parse([{ platform: "website", url: "" }])).toBeUndefined();
  });

  it("names the entry that was refused, by its position in the list", () => {
    const result = socialMediaSchema.safeParse([
      { platform: "website", url: "https://kim.example" },
      { platform: "nowhere", url: "https://kim.example" },
    ]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual([1]);
  });
});

describe("findSocialMediaUrl", () => {
  const links = [
    { platform: "website", url: "https://kim.example" },
    { platform: "mastodon", url: "https://chaos.social/@kim" },
    { platform: "website", url: "https://blog.kim.example" },
  ] as const;

  it("answers with the first address given for that platform", () => {
    expect(findSocialMediaUrl([...links], "website")).toBe("https://kim.example");
  });

  it("gives nothing for a platform nobody entered", () => {
    expect(findSocialMediaUrl([...links], "bluesky")).toBeUndefined();
  });

  it("gives nothing when there are no addresses at all", () => {
    expect(findSocialMediaUrl(undefined, "website")).toBeUndefined();
  });
});

describe("Friendica social media support", () => {
  it("is a platform of its own", () => {
    expect(SOCIAL_PLATFORM_KEYS).toContain("friendica");
  });

  it.each([
    // The form every instance names through WebFinger.
    ["https://friend.enby-box.de/profile/jaddy", "https://friend.enby-box.de/profile/jaddy"],
    ["https://friend.enby-box.de/profile/jaddy/", "https://friend.enby-box.de/profile/jaddy"],
    ["https://www.friend.enby-box.de/profile/jaddy", "https://friend.enby-box.de/profile/jaddy"],
    // The alias the instances publish beside it.
    ["https://libranet.de/~usnfeed", "https://libranet.de/profile/usnfeed"],
    // Answers everywhere without being advertised.
    ["https://loma.ml/u/nytimes", "https://loma.ml/profile/nytimes"],
    // Answered 404 on all seventeen instances, so it is a mistake worth fixing
    // rather than an address worth keeping.
    ["https://friendica.xyz/@montag", "https://friendica.xyz/profile/montag"],
    // The handle, as somebody writes it when naming themselves.
    ["jaddy@friend.enby-box.de", "https://friend.enby-box.de/profile/jaddy"],
    ["@jaddy@friend.enby-box.de", "https://friend.enby-box.de/profile/jaddy"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("friendica", input)).toBe(expected);
  });

  it.each([
    // A single segment is a page on somebody's site far more often than it is a
    // profile, and it answered 404 on every instance measured.
    "https://friend.enby-box.de/jaddy",
    // The instance itself, which is nobody in particular.
    "https://friend.enby-box.de/",
    // A page below a profile is not the profile.
    "https://friend.enby-box.de/profile/jaddy/photos",
    "jaddy",
  ])("refuses %s, which is no profile", (input) => {
    expect(normalizeSocialMediaValue("friendica", input)).toBeNull();
  });

  it("is not guessed from an address, because the address does not say", () => {
    // Anybody may host an instance on any domain, so `/profile/somebody` looks
    // exactly like a page on an ordinary site. Only the host can settle it, by
    // saying through NodeInfo which software it runs.
    expect(detectPlatformFromUrl("https://friend.enby-box.de/profile/jaddy")).toBeNull();
    expect(classifyProfileLink("https://friend.enby-box.de/profile/jaddy")).toEqual({
      platform: "website",
      url: "https://friend.enby-box.de/profile/jaddy",
    });
  });
});

describe("a website address keeps no trailing slash", () => {
  it.each([
    ["https://chillr.de", "https://chillr.de"],
    // The parser puts it there, so it arrives even when nobody typed it.
    ["https://chillr.de/", "https://chillr.de"],
    ["chillr.de", "https://chillr.de"],
    ["https://chillr.de/laden/", "https://chillr.de/laden"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSocialMediaValue("website", input)).toBe(expected);
  });

  it.each(["https://chillr.de/?von=hier", "https://chillr.de/#unten"])(
    "leaves %s alone, which ends in no slash to begin with",
    (input) => {
      expect(normalizeSocialMediaValue("website", input)).toBe(input);
    },
  );

  it("counts the same page as one address however it was written", () => {
    // Both forms name the same page, so the list holds it once.
    expect(
      socialMediaSchema.parse([
        { platform: "website", url: "https://chillr.de" },
        { platform: "website", url: "https://chillr.de/" },
      ]),
    ).toEqual([{ platform: "website", url: "https://chillr.de" }]);
  });
});

describe("detectProfilePlatform", () => {
  it.each([
    ["@dasdom@chaos.social", "mastodon"],
    ["dasdom@chaos.social", "mastodon"],
    ["https://chaos.social/@dasdom", "mastodon"],
    ["https://github.com/phranck", "github"],
    ["instagram.com/jemand", "instagram"],
  ])("names the service behind %s", (input, platform) => {
    expect(detectProfilePlatform(input)).toBe(platform);
  });

  it.each([
    // Nothing here says which service it is, and the editor relies on that
    // silence to leave a platform somebody chose by hand alone.
    ["example.com"],
    ["https://example.com/somebody"],
    ["foo"],
    [""],
    ["   "],
  ])("stays silent on %s, which names no service", (input) => {
    expect(detectProfilePlatform(input)).toBeNull();
  });
});

describe("isFediverseHandle", () => {
  it.each([["@dasdom@chaos.social"], ["dasdom@chaos.social"], ["kim@pixel.tchncs.de"]])(
    "reads %s as a handle",
    (input) => {
      expect(isFediverseHandle(input)).toBe(true);
    },
  );

  it.each([["https://chaos.social/@dasdom"], ["chaos.social"], ["foo"], [""]])(
    "does not read %s as one",
    (input) => {
      expect(isFediverseHandle(input)).toBe(false);
    },
  );
});
