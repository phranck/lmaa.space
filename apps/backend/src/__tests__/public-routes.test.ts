import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_PENDING_CLAIM } from "@lmaa/contracts";

vi.mock("../config/env.js", () => ({
  env: { NODE_ENV: "development", LOG_LEVEL: "silent" },
}));

const publicServiceMocks = vi.hoisted(() => ({
  createManagedDeadLinkReport: vi.fn(),
  createManagedShopConcernReport: vi.fn(),
  getFilteredPublicCategories: vi.fn(),
  getFilteredPublicCategoryBySlug: vi.fn(),
  getFilteredPublicShops: vi.fn(),
  getManagedPublicCacheStats: vi.fn(),
  getManagedPublicCategories: vi.fn(),
  getManagedPublicCategoryBySlug: vi.fn(),
  getManagedPublicContentPageBySlug: vi.fn(),
  getManagedPublicContentPages: vi.fn(),
  getManagedPublicNavItems: vi.fn(),
  getManagedPublicRejectedShops: vi.fn(),
  getManagedPublicRejectionPageByToken: vi.fn(),
  getManagedPublicShopById: vi.fn(),
  getManagedPublicShops: vi.fn(),
  getManagedPublicStats: vi.fn(),
  getPublicFilterOptions: vi.fn(),
  searchFilteredPublicCatalog: vi.fn(),
  searchManagedPublicCatalog: vi.fn(),
  toggleShopLike: vi.fn(),
  validateShopUrl: vi.fn(),
}));

const formConfigMocks = vi.hoisted(() => ({
  getManagedPublicFormConfig: vi.fn(),
  getManagedPublicFormConfigBySlug: vi.fn(),
}));

const mediaMocks = vi.hoisted(() => ({
  getMediaAliasMap: vi.fn(),
  getMediaShortcodeAssetMap: vi.fn(),
}));

const footerMocks = vi.hoisted(() => ({
  getFooterConfig: vi.fn(),
}));

const markdownMocks = vi.hoisted(() => ({
  getEnabledMarkdownWidgetByKey: vi.fn(),
}));

const footerPreviewMocks = vi.hoisted(() => ({
  getFooterPreviewSession: vi.fn(),
}));

const contentPreviewMocks = vi.hoisted(() => ({
  getContentPreviewSession: vi.fn(),
}));

const heroMocks = vi.hoisted(() => ({
  getCurrentHeroImage: vi.fn(),
}));

const socialPreviewMocks = vi.hoisted(() => ({
  getSocialPreviewImage: vi.fn(),
}));

const formSubmissionMocks = vi.hoisted(() => ({
  executeSubmissionChain: vi.fn(),
}));

const formValidationMocks = vi.hoisted(() => ({
  buildFormValidationSchema: vi.fn(),
}));

const supportPromptMocks = vi.hoisted(() => ({
  listPublishedSupportPrompts: vi.fn(),
}));

const supportPromptServiceMocks = vi.hoisted(() => ({
  getSupportPromptLimits: vi.fn(),
}));

const pendingSponsorshipMocks = vi.hoisted(() => ({
  createPendingSponsorship: vi.fn(),
}));

const sponsorRepoMocks = vi.hoisted(() => ({
  listCurrentSponsors: vi.fn(),
}));

const sponsorServiceMocks = vi.hoisted(() => ({
  getSponsoringConfig: vi.fn(),
  sponsorYearStart: vi.fn(() => "2025-08-24"),
}));

vi.mock("../services/public.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/public.js")>();
  return { ...actual, ...publicServiceMocks };
});
vi.mock("../services/admin-form-config.js", () => formConfigMocks);
vi.mock("../services/admin-media.js", () => mediaMocks);
vi.mock("../repositories/footer-config.js", () => footerMocks);
vi.mock("../repositories/markdown-widgets.js", () => markdownMocks);
vi.mock("../services/footer-preview-store.js", () => footerPreviewMocks);
vi.mock("../services/content-preview-store.js", () => contentPreviewMocks);
vi.mock("../services/hero.js", () => heroMocks);
vi.mock("../services/social-preview-images.js", () => socialPreviewMocks);
vi.mock("../services/form-submission.js", () => formSubmissionMocks);
vi.mock("../services/form-validation.js", () => formValidationMocks);
vi.mock("../repositories/support-prompts.js", () => supportPromptMocks);
vi.mock("../services/support-prompts.js", () => supportPromptServiceMocks);
vi.mock("../services/pending-sponsorships.js", () => pendingSponsorshipMocks);
vi.mock("../repositories/sponsors.js", () => sponsorRepoMocks);
vi.mock("../services/sponsors.js", () => sponsorServiceMocks);
vi.mock("../middleware/rate-limit.js", () => ({
  rateLimit: vi.fn(() => (_c: unknown, next: () => Promise<void>) => next()),
  resolveClientIp: vi.fn(() => "127.0.0.1"),
}));

import { publicRoutes } from "../routes/public.js";

describe("publicRoutes", () => {
  const app = new Hono();
  app.route("/", publicRoutes);

  beforeEach(() => vi.clearAllMocks());

  describe("GET /categories", () => {
    it("returns categories", async () => {
      publicServiceMocks.getManagedPublicCategories.mockResolvedValue([{ id: 1, name: "Mode" }]);

      const res = await app.request("/categories");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: 1, name: "Mode" }] });
    });
  });

  describe("GET /support-prompts", () => {
    it("asks for today's prompts and answers with them and the limits", async () => {
      supportPromptMocks.listPublishedSupportPrompts.mockResolvedValue([
        { id: "a", slot: "my-shops", name: "Karte" },
      ]);
      supportPromptServiceMocks.getSupportPromptLimits.mockResolvedValue({
        maxShown: 4,
        snoozeDays: 14,
      });

      const res = await app.request("/support-prompts");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          prompts: [{ id: "a", slot: "my-shops", name: "Karte" }],
          limits: { maxShown: 4, snoozeDays: 14 },
        },
      });

      // The window is tested against a day, not a moment, so a prompt does not
      // end part way through the day it names.
      const [day] = supportPromptMocks.listPublishedSupportPrompts.mock.calls[0];
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("lets a person edit without a deployment, so the answer may be revalidated", async () => {
      supportPromptMocks.listPublishedSupportPrompts.mockResolvedValue([]);
      supportPromptServiceMocks.getSupportPromptLimits.mockResolvedValue({
        maxShown: 4,
        snoozeDays: 14,
      });

      const res = await app.request("/support-prompts");

      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=60, stale-while-revalidate=300",
      );
    });
  });

  describe("GET /stats", () => {
    it("returns shop count and pending review count", async () => {
      publicServiceMocks.getManagedPublicStats.mockResolvedValue({
        shopCount: 42,
        pendingReviewCount: 7,
      });

      const res = await app.request("/stats");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: { shopCount: 42, pendingReviewCount: 7 },
      });
    });
  });

  describe("GET /categories/:slug", () => {
    it("returns category with shops", async () => {
      publicServiceMocks.getManagedPublicCategoryBySlug.mockResolvedValue({
        ok: true,
        data: { id: 1, name: "Mode", shops: [] },
      });

      const res = await app.request("/categories/mode");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 1, name: "Mode", shops: [] } });
    });

    it("returns 404 when not found", async () => {
      publicServiceMocks.getManagedPublicCategoryBySlug.mockResolvedValue({
        ok: false,
        reason: "not_found",
      });

      const res = await app.request("/categories/unknown");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /shops", () => {
    it("returns shops and lets the client cache the response", async () => {
      publicServiceMocks.getManagedPublicShops.mockResolvedValue([{ id: 1 }]);

      const res = await app.request("/shops");

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
      expect(await res.json()).toEqual({ data: [{ id: 1 }] });
    });
  });

  describe("GET /search", () => {
    it("searches catalog", async () => {
      publicServiceMocks.searchManagedPublicCatalog.mockResolvedValue({
        shops: [],
        categories: [],
        query: "fair",
        total: 0,
      });

      const res = await app.request("/search?q=fair");

      expect(res.status).toBe(200);
      expect(publicServiceMocks.searchManagedPublicCatalog).toHaveBeenCalledWith("fair");
    });
  });

  describe("GET /check-url", () => {
    it("validates shop URL", async () => {
      publicServiceMocks.validateShopUrl.mockResolvedValue({ status: "available" });

      const res = await app.request("/check-url?url=https://new-shop.de");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { status: "available" } });
    });
  });

  describe("POST /form/:slug/submit", () => {
    it("normalizes submitted shop URLs before validation and persistence", async () => {
      const rawShopUrl =
        "https://www.kraeuterhaus.de/?campaign=bing/brand/brand_de/&ref=wkz11&msclkid=d9dd619c12c31f6f42df0bce8ab1bf76&utm_source=bing&utm_medium=cpc&utm_campaign=Brand&utm_term=%2Bst%20%2Bbernhard&utm_content=KSB_1-18%20kraeuterhaus%20st%20bernhard%20bad%20ditzenbach";
      const normalizedShopUrl = "https://kraeuterhaus.de";
      const formConfig = {
        id: 9,
        name: "shop-submission",
        isActive: true,
        rows: [],
        submissionConfig: { steps: [{ type: "create-shop-suggestion" }] },
      };

      formConfigMocks.getManagedPublicFormConfigBySlug.mockResolvedValue({
        ok: true,
        data: formConfig,
      });
      formValidationMocks.buildFormValidationSchema.mockReturnValue({
        safeParse: () => ({
          success: true,
          data: { shopName: "Kräuterhaus", shopUrl: rawShopUrl },
        }),
      });
      publicServiceMocks.validateShopUrl.mockResolvedValue({ status: "available" });

      const res = await app.request("/form/shop-submission/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName: "Kräuterhaus", shopUrl: rawShopUrl }),
      });

      expect(res.status).toBe(201);
      expect(publicServiceMocks.validateShopUrl).toHaveBeenCalledWith(normalizedShopUrl);
      expect(formSubmissionMocks.executeSubmissionChain).toHaveBeenCalledWith(
        formConfig.submissionConfig,
        { shopName: "Kräuterhaus", shopUrl: normalizedShopUrl },
        formConfig,
      );
    });
  });

  describe("GET /nav/:navId", () => {
    it("returns nav items", async () => {
      publicServiceMocks.getManagedPublicNavItems.mockResolvedValue([{ id: 1, label: "Home" }]);

      const res = await app.request("/nav/header");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: 1, label: "Home" }] });
    });

    it("rejects invalid navId", async () => {
      const res = await app.request("/nav/invalid");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /content", () => {
    it("returns content pages", async () => {
      publicServiceMocks.getManagedPublicContentPages.mockResolvedValue([{ slug: "about" }]);

      const res = await app.request("/content");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ slug: "about" }] });
    });
  });

  describe("GET /content/:slug", () => {
    it("returns page by slug", async () => {
      publicServiceMocks.getManagedPublicContentPageBySlug.mockResolvedValue({
        slug: "about",
        title: "About",
      });

      const res = await app.request("/content/about");

      expect(res.status).toBe(200);
    });

    it("returns 404 when not found", async () => {
      publicServiceMocks.getManagedPublicContentPageBySlug.mockResolvedValue(null);

      const res = await app.request("/content/missing");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /shops/:id/report", () => {
    it("creates dead link report", async () => {
      publicServiceMocks.createManagedDeadLinkReport.mockResolvedValue({ ok: true });

      const res = await app.request("/shops/1/report", { method: "POST" });

      expect(res.status).toBe(200);
    });

    it("returns 404 when shop not found", async () => {
      publicServiceMocks.createManagedDeadLinkReport.mockResolvedValue({
        ok: false,
        reason: "not_found",
      });

      const res = await app.request("/shops/99/report", { method: "POST" });

      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid id", async () => {
      const res = await app.request("/shops/abc/report", { method: "POST" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /shops/:id/concern", () => {
    it("creates concern report", async () => {
      publicServiceMocks.createManagedShopConcernReport.mockResolvedValue({ ok: true });

      const res = await app.request("/shops/1/concern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "This shop sells fake products and scams people" }),
      });

      expect(res.status).toBe(200);
    });

    it("returns 400 for short reason", async () => {
      publicServiceMocks.createManagedShopConcernReport.mockResolvedValue({
        ok: false,
        reason: "invalid_reason",
      });

      const res = await app.request("/shops/1/concern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "This shop sells fake products and scams people" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /shops/:id/like", () => {
    it("toggles likes with fingerprint and resolved client IP", async () => {
      publicServiceMocks.toggleShopLike.mockResolvedValue({ ok: true, data: {} });

      const res = await app.request("/shops/1/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liked: true,
          token: "token",
          fingerprint: "fingerprint-123456",
        }),
      });

      expect(res.status).toBe(200);
      expect(publicServiceMocks.toggleShopLike).toHaveBeenCalledWith(
        1,
        true,
        "token",
        "fingerprint-123456",
        "127.0.0.1",
      );
    });

    it("names no request field when refusing an incomplete body", async () => {
      const res = await app.request("/shops/1/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ error: { message: "Invalid request", code: "invalid_request" } });
      // The validator's own object lists every expected field, which on a
      // public route tells an outsider exactly what to send.
      const serialised = JSON.stringify(body);
      expect(serialised).not.toContain("fingerprint");
      expect(serialised).not.toContain("ZodError");
    });

    it("rejects like requests without a usable fingerprint", async () => {
      const res = await app.request("/shops/1/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: true, token: "token", fingerprint: "" }),
      });

      expect(res.status).toBe(400);
      expect(publicServiceMocks.toggleShopLike).not.toHaveBeenCalled();
    });
  });

  describe("GET /sponsors", () => {
    beforeEach(() => {
      sponsorRepoMocks.listCurrentSponsors.mockResolvedValue([
        {
          id: "sponsor-1",
          firstName: "Kim",
          lastName: "Lorenz",
          socialMedia: [{ platform: "website", url: "https://kim.example/" }],
          imageUrl: "",
          claim: "",
          paidAt: "2026-08-01",
          amountCents: 4500,
          published: true,
        },
      ]);
      sponsorServiceMocks.getSponsoringConfig.mockResolvedValue({
        costs: [{ label: "Server", amountCents: 22_600 }],
        minAmountCents: 2500,
        payeeName: "Frank Gregor",
        payeeIban: "AT551900104704666811",
        payeeBic: "TRBKATW2XXX",
      });
    });

    it("does not carry the account the money goes to", async () => {
      // Those details belong on the support page, where somebody is about to
      // transfer money. This answer is fetched wherever the sponsor wall
      // appears, which is not the same question.
      const res = await app.request("/sponsors");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(Object.keys(body.data).sort()).toEqual([
        "costsTotalCents",
        "coveredCents",
        "minAmountCents",
        "sponsors",
      ]);
    });

    it("names nobody who asked not to be named, and no amount for anybody", async () => {
      sponsorRepoMocks.listCurrentSponsors.mockResolvedValue([
        {
          id: "sponsor-1",
          firstName: "Kim",
          lastName: "Lorenz",
          socialMedia: [],
          imageUrl: "",
          claim: "",
          paidAt: "2026-08-01",
          amountCents: 4500,
          published: true,
        },
        {
          id: "sponsor-2",
          firstName: "Alex",
          lastName: "Berg",
          socialMedia: [],
          imageUrl: "",
          claim: "",
          paidAt: "2026-08-02",
          amountCents: 5500,
          published: false,
        },
      ]);

      const res = await app.request("/sponsors");
      const body = await res.json();

      expect(body.data.sponsors).toHaveLength(1);
      expect(body.data.sponsors[0].id).toBe("sponsor-1");
      expect(body.data.sponsors[0]).not.toHaveProperty("amountCents");
      // What the unnamed one gave still counts towards the year.
      expect(body.data.coveredCents).toBe(10_000);
    });
  });

  describe("POST /sponsorships", () => {
    /** A filled-in form, with anything a single test cares about on top. */
    function body(overrides: Record<string, unknown> = {}) {
      return JSON.stringify({
        firstName: "Kim",
        lastName: "Lorenz",
        link: "https://github.com/kim",
        claim: "Weil es sonst niemand macht.",
        amountCents: 4500,
        published: true,
        ...overrides,
      });
    }

    it("answers with the reference, raw and as it is printed", async () => {
      pendingSponsorshipMocks.createPendingSponsorship.mockResolvedValue({
        ok: true,
        pending: { id: "row-1", reference: "RF18SPON26001" },
      });

      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body(),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        data: { reference: "RF18SPON26001", referenceFormatted: "RF18 SPON 2600 1" },
      });
    });

    it("hands the service what the form said", async () => {
      pendingSponsorshipMocks.createPendingSponsorship.mockResolvedValue({
        ok: true,
        pending: { id: "row-1", reference: "RF18SPON26001" },
      });

      await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body({ published: false }),
      });

      expect(pendingSponsorshipMocks.createPendingSponsorship).toHaveBeenCalledWith({
        firstName: "Kim",
        lastName: "Lorenz",
        link: "https://github.com/kim",
        claim: "Weil es sonst niemand macht.",
        amountCents: 4500,
        published: false,
      });
    });

    it("is never cached, because the answer belongs to one person", async () => {
      pendingSponsorshipMocks.createPendingSponsorship.mockResolvedValue({
        ok: true,
        pending: { id: "row-1", reference: "RF18SPON26001" },
      });

      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body(),
      });

      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("refuses a claim longer than the form allows", async () => {
      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body({ claim: "x".repeat(MAX_PENDING_CLAIM + 1) }),
      });

      expect(res.status).toBe(400);
      expect(pendingSponsorshipMocks.createPendingSponsorship).not.toHaveBeenCalled();
    });

    it("refuses a body carrying anything the form does not ask for", async () => {
      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body({ amountCents: 12000, imageUrl: "https://example.test/kim.png" }),
      });

      expect(res.status).toBe(400);
      expect(pendingSponsorshipMocks.createPendingSponsorship).not.toHaveBeenCalled();
    });

    it("names no request field when refusing a body", async () => {
      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const answered = await res.json();

      expect(res.status).toBe(400);
      expect(answered).toEqual({ error: { message: "Invalid request", code: "invalid_request" } });
      expect(JSON.stringify(answered)).not.toContain("published");
    });

    it("refuses a body far larger than a filled-in form", async () => {
      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body({ claim: "x".repeat(8 * 1024) }),
      });

      expect(res.status).toBe(413);
      expect(pendingSponsorshipMocks.createPendingSponsorship).not.toHaveBeenCalled();
    });

    it("says which field is wrong when the address cannot be placed", async () => {
      pendingSponsorshipMocks.createPendingSponsorship.mockResolvedValue({
        ok: false,
        reason: "link_unusable",
      });

      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body({ link: "not an address at all" }),
      });

      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("link_unusable");
    });

    it("says to try again when no reference could be issued", async () => {
      pendingSponsorshipMocks.createPendingSponsorship.mockResolvedValue({
        ok: false,
        reason: "reference_unavailable",
      });

      const res = await app.request("/sponsorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body(),
      });

      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe("reference_unavailable");
    });
  });

  describe("GET /form-config/:name", () => {
    it("returns form config", async () => {
      formConfigMocks.getManagedPublicFormConfig.mockResolvedValue({
        ok: true,
        data: { id: 1, name: "contact" },
      });

      const res = await app.request("/form-config/contact");

      expect(res.status).toBe(200);
    });

    it("returns 404 when not found", async () => {
      formConfigMocks.getManagedPublicFormConfig.mockResolvedValue({
        ok: false,
        reason: "not_found",
      });

      const res = await app.request("/form-config/missing");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /footer-config", () => {
    it("returns footer config", async () => {
      footerMocks.getFooterConfig.mockResolvedValue({ columns: [] });

      const res = await app.request("/footer-config");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /social-preview-image", () => {
    it("returns the configured social preview image", async () => {
      socialPreviewMocks.getSocialPreviewImage.mockResolvedValue({
        id: 12,
        url: "https://img.example/social.jpg",
        version: "12-1780000000000",
        updatedAt: "2026-06-05T12:00:00.000Z",
      });

      const res = await app.request("/social-preview-image");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          id: 12,
          url: "https://img.example/social.jpg",
          version: "12-1780000000000",
          updatedAt: "2026-06-05T12:00:00.000Z",
        },
      });
    });
  });

  describe("GET /markdown-widgets/:key", () => {
    it("returns widget", async () => {
      markdownMocks.getEnabledMarkdownWidgetByKey.mockResolvedValue({ key: "hero", content: "Hi" });

      const res = await app.request("/markdown-widgets/hero");

      expect(res.status).toBe(200);
    });

    it("returns 404 when not found", async () => {
      markdownMocks.getEnabledMarkdownWidgetByKey.mockResolvedValue(null);

      const res = await app.request("/markdown-widgets/missing");

      expect(res.status).toBe(404);
    });
  });

  describe("GET /footer-preview/:token", () => {
    it("returns preview for valid token", async () => {
      const token = "a".repeat(32);
      footerPreviewMocks.getFooterPreviewSession.mockReturnValue({ columns: [] });

      const res = await app.request(`/footer-preview/${token}`);

      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid token format", async () => {
      const res = await app.request("/footer-preview/short");

      expect(res.status).toBe(400);
    });

    it("returns 404 when preview not found", async () => {
      const token = "b".repeat(32);
      footerPreviewMocks.getFooterPreviewSession.mockReturnValue(null);

      const res = await app.request(`/footer-preview/${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /content-preview/:token", () => {
    it("returns preview for valid token without caching", async () => {
      const token = "d".repeat(32);
      contentPreviewMocks.getContentPreviewSession.mockReturnValue({
        slug: "draft-page",
        title: "Draft Page",
        content: "# Draft",
        showTitle: true,
        contentWidth: "full",
      });

      const res = await app.request(`/content-preview/${token}`);

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(await res.json()).toEqual({
        data: {
          slug: "draft-page",
          title: "Draft Page",
          content: "# Draft",
          showTitle: true,
          contentWidth: "full",
        },
      });
    });

    it("returns 400 for invalid token format", async () => {
      const res = await app.request("/content-preview/short");

      expect(res.status).toBe(400);
      expect(contentPreviewMocks.getContentPreviewSession).not.toHaveBeenCalled();
    });

    it("returns 404 when preview not found", async () => {
      const token = "e".repeat(32);
      contentPreviewMocks.getContentPreviewSession.mockReturnValue(null);

      const res = await app.request(`/content-preview/${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /rejected/:token", () => {
    it("returns rejection page", async () => {
      const token = "c".repeat(32);
      publicServiceMocks.getManagedPublicRejectionPageByToken.mockResolvedValue({
        shopName: "Bad Shop",
      });

      const res = await app.request(`/rejected/${token}`);

      expect(res.status).toBe(200);
    });

    it("returns 400 for invalid token", async () => {
      const res = await app.request("/rejected/invalid");

      expect(res.status).toBe(400);
    });

    it("returns 404 when not found", async () => {
      const token = "d".repeat(32);
      publicServiceMocks.getManagedPublicRejectionPageByToken.mockResolvedValue(null);

      const res = await app.request(`/rejected/${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /rejected-shops", () => {
    it("returns paginated rejected shops", async () => {
      publicServiceMocks.getManagedPublicRejectedShops.mockResolvedValue({
        entries: [
          {
            id: "submission:1",
            shopName: "Bad Shop",
            ogImage: null,
            logoBackgroundColor: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: "15",
        search: "bad",
        sortBy: "shopName",
        sortDir: "asc",
        metrics: { totalRejectedShops: 12, filteredRejectedShops: 1 },
      });

      const res = await app.request(
        "/rejected-shops?q=bad&page=1&pageSize=15&sortBy=shopName&sortDir=asc",
      );

      expect(res.status).toBe(200);
      expect(publicServiceMocks.getManagedPublicRejectedShops).toHaveBeenCalledWith({
        search: "bad",
        page: 1,
        pageSize: "15",
        sortBy: "shopName",
        sortDir: "asc",
      });
      expect(await res.json()).toEqual({
        data: {
          entries: [
            {
              id: "submission:1",
              shopName: "Bad Shop",
              ogImage: null,
              logoBackgroundColor: null,
            },
          ],
          total: 1,
          page: 1,
          pageSize: "15",
          search: "bad",
          sortBy: "shopName",
          sortDir: "asc",
          metrics: { totalRejectedShops: 12, filteredRejectedShops: 1 },
        },
      });
    });
  });

  describe("GET /filtered/categories", () => {
    it("returns filtered categories", async () => {
      publicServiceMocks.getFilteredPublicCategories.mockResolvedValue({
        categories: [{ id: 1 }],
        totalShops: 1,
      });

      const res = await app.request("/filtered/categories?country=DE");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /filtered/shops", () => {
    it("returns filtered shops", async () => {
      publicServiceMocks.getFilteredPublicShops.mockResolvedValue([{ id: 1 }]);

      const res = await app.request("/filtered/shops?country=DE");

      expect(res.status).toBe(200);
    });
  });

  describe("filtered routes reject what the schema forbids", () => {
    // Each of these used to reach the handler and raise, which the service
    // reported as 500. The schema states the bounds, so the request has to be
    // refused at the boundary instead.
    const badQueries = [
      "radius=abc",
      "radius=0",
      "radius=-5",
      "radius=99999",
      "radius=",
      `country=${"a".repeat(300)}`,
      `city=${"a".repeat(300)}`,
    ];

    const routes = [
      "/filtered/shops",
      "/filtered/search",
      "/filtered/categories",
      "/filtered/categories/beer",
    ];

    for (const route of routes) {
      for (const query of badQueries) {
        it(`answers 400 for ${route}?${query}`, async () => {
          const res = await app.request(`${route}?${query}`);

          expect(res.status).toBe(400);
        });
      }
    }

    it("answers in the project's error shape rather than the validator's", async () => {
      const res = await app.request("/filtered/shops?radius=abc");
      const body = await res.json();

      expect(body).toEqual({ error: { message: "Invalid request", code: "invalid_request" } });
      // The validation library's own object names every expected field and its
      // constraints, which on a public route describes the request to send.
      expect(JSON.stringify(body)).not.toContain("ZodError");
      expect(JSON.stringify(body)).not.toContain("issues");
    });

    it("still passes valid filters through to the service", async () => {
      publicServiceMocks.getFilteredPublicShops.mockResolvedValue([{ id: 1 }]);

      const res = await app.request("/filtered/shops?city=Berlin&radius=50&country=DE");

      expect(res.status).toBe(200);
      expect(publicServiceMocks.getFilteredPublicShops).toHaveBeenCalledWith({
        city: "Berlin",
        radius: 50,
        country: "DE",
      });
    });
  });

  describe("GET /filter-options", () => {
    it("returns filter options", async () => {
      publicServiceMocks.getPublicFilterOptions.mockResolvedValue({ countries: ["DE"] });

      const res = await app.request("/filter-options");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { countries: ["DE"] } });
    });
  });

  describe("GET /media-aliases", () => {
    it("returns media alias map", async () => {
      mediaMocks.getMediaAliasMap.mockResolvedValue({ hero: "https://cdn.example.com/hero.png" });

      const res = await app.request("/media-aliases");

      expect(res.status).toBe(200);
    });
  });

  describe("GET /media-shortcode-assets", () => {
    it("returns media shortcode asset map", async () => {
      mediaMocks.getMediaShortcodeAssetMap.mockResolvedValue({
        hero: { url: "https://cdn.example.com/hero.png", posterUrl: null },
      });

      const res = await app.request("/media-shortcode-assets");

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: { hero: { url: "https://cdn.example.com/hero.png", posterUrl: null } },
      });
    });
  });
});
