import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.fn();
const loginMock = vi.fn();
const detectFacetsMock = vi.fn();

vi.mock("@atproto/api", () => {
  class FakeAgent {
    login = loginMock;
    post = postMock;
  }
  class FakeRichText {
    text: string;
    facets: unknown[] = [];
    constructor({ text }: { text: string }) {
      this.text = text;
    }
    detectFacets = detectFacetsMock;
  }
  return { AtpAgent: FakeAgent, RichText: FakeRichText };
});

import type { SocialMediaAccount, SocialMediaPostTemplate, Submission } from "../db/schema.js";
import { __test__, postToBlueskyAccount } from "../services/bluesky.js";

const account: SocialMediaAccount = {
  id: 1,
  platform: "bluesky",
  label: "main",
  profileUrl: "https://bsky.app/profile/alice.bsky.social",
  canPost: true,
  showInFooter: true,
  instanceUrl: "",
  handle: "alice.bsky.social",
  username: null,
  accessToken: "abcd-efgh-ijkl-mnop",
  visibility: null,
  maxPostCharacters: 300,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const template: SocialMediaPostTemplate = {
  id: 7,
  name: "welcome",
  platforms: ["bluesky"],
  scopes: ["submission"],
  bodyMastodon: null,
  bodyBluesky: "Welcome {{shopName}} — {{shopUrl}}",
  isSystemTemplate: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const submission: Submission = {
  id: 42,
  shopName: "Good Karma",
  shopUrl: "https://good.example",
  region: ["DE"],
  pickup: "",
  shipping: "",
  description: "",
  ogImage: null,
  socialMedia: {},
  contactEmail: null,
  submitterEmail: null,
  submitterNote: null,
  status: "approved",
  adminNote: null,
  rejectionLongText: null,
  rejectionToken: null,
  feedbackSent: false,
  readyForReview: true,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  loginMock.mockReset();
  postMock.mockReset();
  detectFacetsMock.mockReset();
  __test__.resetRateLimitBuckets();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("postToBlueskyAccount", () => {
  it("logs in and posts the rendered text with facets", async () => {
    loginMock.mockResolvedValue({});
    detectFacetsMock.mockResolvedValue(undefined);
    postMock.mockResolvedValue({});
    await postToBlueskyAccount(account, template, {
      submission,
      newShopId: 100,
      adminNote: "",
      categoryNames: [],
    });
    expect(loginMock).toHaveBeenCalledWith({
      identifier: "alice.bsky.social",
      password: "abcd-efgh-ijkl-mnop",
    });
    expect(detectFacetsMock).toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("Good Karma") }),
    );
  });

  it("rejects when body length exceeds maxPostCharacters", async () => {
    const longTemplate = { ...template, bodyBluesky: "x".repeat(301) };
    await expect(
      postToBlueskyAccount(account, longTemplate, {
        submission,
        newShopId: 100,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/maxPostCharacters/);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("rejects when account.platform is not bluesky", async () => {
    const wrongAccount: SocialMediaAccount = { ...account, platform: "mastodon" };
    await expect(
      postToBlueskyAccount(wrongAccount, template, {
        submission,
        newShopId: 100,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/not a bluesky/);
  });

  it("rejects on rate-limit hit after consuming the bucket", async () => {
    for (let i = 0; i < 100; i++) {
      __test__.consumeRateLimit(account.id);
    }
    await expect(
      postToBlueskyAccount(account, template, {
        submission,
        newShopId: 100,
        adminNote: "",
        categoryNames: [],
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});
