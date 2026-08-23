import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";

import {
  PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE,
  PUBLIC_REJECTED_SHOP_PAGE_SIZES,
  PUBLIC_REJECTED_SHOP_SORT_FIELDS,
  type PendingSponsorshipReceipt,
  type PublicRejectedShopPageSize,
  type PublicRejectedShopSortDirection,
  type PublicRejectedShopSortField,
  type SponsorsPayload,
  pendingSponsorshipInputSchema,
} from "@lmaa/contracts";
import { decodeShopToken, formatCreditorReference } from "@lmaa/shared";

import { env } from "../config/env.js";
import {
  CACHE_EDITABLE,
  CACHE_REVALIDATE,
  CACHE_NONE,
  CACHE_PER_VISITOR,
  CACHE_STABLE,
  CACHE_VOLATILE,
} from "../lib/cache-control.js";
import { fail, ok } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import { shopFilterSchema } from "../lib/shop-filters.js";
import { rateLimit, resolveClientIp } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate-request.js";
import { getFooterConfig } from "../repositories/footer-config.js";
import { getEnabledMarkdownWidgetByKey } from "../repositories/markdown-widgets.js";
import { listCurrentSponsors } from "../repositories/sponsors.js";
import { listPublishedSupportPrompts } from "../repositories/support-prompts.js";
import {
  getManagedPublicFormConfig,
  getManagedPublicFormConfigBySlug,
} from "../services/admin-form-config.js";
import { getMediaAliasMap, getMediaShortcodeAssetMap } from "../services/admin-media.js";
import { getContentPreviewSession } from "../services/content-preview-store.js";
import { getFooterPreviewSession } from "../services/footer-preview-store.js";
import { executeSubmissionChain } from "../services/form-submission.js";
import { buildFormValidationSchema } from "../services/form-validation.js";
import { getCurrentHeroImage } from "../services/hero.js";
import { createPendingSponsorship } from "../services/pending-sponsorships.js";
import {
  validateShopUrl,
  normalizeSubmittedShopUrl,
  createManagedDeadLinkReport,
  createManagedShopConcernReport,
  getManagedPublicCategories,
  getManagedPublicCategoryBySlug,
  getManagedPublicContentPageBySlug,
  getManagedPublicContentPages,
  getManagedPublicNavItems,
  getManagedPublicRejectedShops,
  getManagedPublicRejectionPageByToken,
  getManagedPublicShopById,
  getManagedPublicShops,
  getManagedPublicStats,
  searchManagedPublicCatalog,
  getFilteredPublicCategories,
  getFilteredPublicCategoryBySlug,
  getFilteredPublicShops,
  getPublicFilterOptions,
  searchFilteredPublicCatalog,
  toggleShopLike,
} from "../services/public.js";
import { listFooterSocialMediaAccounts } from "../services/social-media-accounts.js";
import { getSocialPreviewImage } from "../services/social-preview-images.js";
import { getSponsoringConfig, sponsorYearStart } from "../services/sponsors.js";
import { getSupportPromptLimits } from "../services/support-prompts.js";

/**
 * Public API routes consumed by the website and external clients.
 */
export const publicRoutes = new Hono<{ Variables: { requestId: string } }>();

const publicReadLimit = rateLimit({ max: 100, windowMs: 60 * 1000 });

/**
 * How large a sponsorship form may be.
 *
 * The contract caps its four text fields at 610 characters between them, which
 * is 2440 bytes where every one of them is four bytes of UTF-8, plus about
 * eighty for the keys and the quoting. Four kilobytes leaves room for that and
 * refuses anything that is not a filled-in form. The service's own limit of ten
 * megabytes is meant for media and says nothing useful here.
 */
const PENDING_SPONSORSHIP_BODY_BYTES = 4 * 1024;

/**
 * How often one source may announce a sponsorship in an hour.
 *
 * Lower than the twenty a shop submission gets, because each of these writes
 * somebody's name and sentence into a table and stands there for sixty days.
 * Filling the form in once and correcting it twice fits.
 */
const PENDING_SPONSORSHIP_MAX_PER_HOUR = 5;
const concernBodySchema = z.object({ reason: z.string().min(1).max(2000) });
const rejectedShopsQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z
    .enum(PUBLIC_REJECTED_SHOP_PAGE_SIZES)
    .optional()
    .default(PUBLIC_REJECTED_SHOP_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(PUBLIC_REJECTED_SHOP_SORT_FIELDS).optional().default("rejectedAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

// GET /api/categories
publicRoutes.get("/categories", publicReadLimit, async (c) => {
  const rows = await getManagedPublicCategories();
  c.header("Cache-Control", CACHE_PER_VISITOR);
  return ok(c, rows);
});

// GET /api/stats – unique active shop count
publicRoutes.get("/stats", publicReadLimit, async (c) => {
  const stats = await getManagedPublicStats();
  c.header("Cache-Control", CACHE_VOLATILE);
  return ok(c, stats);
});

// GET /api/categories/:slug
publicRoutes.get("/categories/:slug", publicReadLimit, async (c) => {
  const result = await getManagedPublicCategoryBySlug(c.req.param("slug"));
  if (!result.ok) {
    return fail(c, 404, "Category not found");
  }

  c.header("Cache-Control", CACHE_PER_VISITOR);
  return ok(c, result.data);
});

// GET /api/shops
publicRoutes.get("/shops", publicReadLimit, async (c) => {
  const shops = await getManagedPublicShops();
  c.header("Cache-Control", CACHE_VOLATILE);
  return ok(c, shops);
});

// GET /api/shops/:token
publicRoutes.get("/shops/:token", publicReadLimit, async (c) => {
  const id = decodeShopToken(c.req.param("token"));
  if (id === null) {
    return fail(c, 400, "Invalid shop token");
  }

  const result = await getManagedPublicShopById(id);
  if (!result.ok) {
    return fail(c, 404, "Shop not found");
  }

  c.header("Cache-Control", CACHE_VOLATILE);
  return ok(c, result.data);
});

// GET /api/search?q=...
publicRoutes.get("/search", publicReadLimit, async (c) => {
  const q = c.req.query("q")?.slice(0, 200);
  const result = await searchManagedPublicCatalog(q);
  return ok(c, result);
});

// GET /api/check-url?url= – check if a shop with the same domain already exists
publicRoutes.get("/check-url", publicReadLimit, async (c) => {
  const result = await validateShopUrl(c.req.query("url"));
  return ok(c, result);
});

// POST /api/form/:slug/submit — generic form submission
publicRoutes.post(
  "/form/:slug/submit",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const slug = c.req.param("slug");
    const rawData = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!rawData) return fail(c, 400, "Invalid JSON body");

    const result = await getManagedPublicFormConfigBySlug(slug);
    if (!result.ok || !result.data.isActive) return fail(c, 404, "Not found");
    if (!result.data.submissionConfig) return fail(c, 400, "No submission config");

    const schema = buildFormValidationSchema(result.data.rows);
    const parsed = schema.safeParse(rawData);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      c.status(400);
      return c.json({ error: { message: "Validation failed", issues } });
    }

    const rawShopUrl =
      typeof parsed.data.shopUrl === "string" ? parsed.data.shopUrl.trim() : undefined;
    if (rawShopUrl) {
      parsed.data.shopUrl = normalizeSubmittedShopUrl(rawShopUrl) ?? rawShopUrl;
    }
    const shopUrl = typeof parsed.data.shopUrl === "string" ? parsed.data.shopUrl : undefined;
    if (shopUrl) {
      const urlCheck = await validateShopUrl(shopUrl);
      if (urlCheck.status === "invalid") {
        c.status(400);
        return c.json({
          error: {
            message: "Bitte eine gültige Shop-URL eingeben (z.B. example.de).",
            status: "invalid",
          },
        });
      }
      if (urlCheck.status === "blocked") {
        c.status(409);
        return c.json({
          error: {
            message: "Diese Shop-URL kann nicht eingereicht werden.",
            status: "blocked",
            messageMarkdown: urlCheck.messageMarkdown,
          },
        });
      }
      if (urlCheck.status === "published") {
        c.status(409);
        return c.json({
          error: {
            message: "Der Shop ist bereits eingetragen.",
            status: "published",
            shopName: urlCheck.shopName,
            shopUrl: urlCheck.shopUrl,
          },
        });
      }
      if (urlCheck.status === "rejected") {
        c.status(409);
        return c.json({
          error: {
            message: "Dieser Shop wurde bereits geprüft und abgelehnt.",
            status: "rejected",
            shopName: urlCheck.shopName,
            rejectionUrl: urlCheck.rejectionUrl,
          },
        });
      }
      if (urlCheck.status === "pending") {
        c.status(409);
        return c.json({
          error: {
            message: "Dieser Shop wurde bereits eingereicht und wartet auf Prüfung.",
            status: "pending",
            shopName: urlCheck.shopName,
          },
        });
      }
    }

    await executeSubmissionChain(result.data.submissionConfig, parsed.data, result.data);
    return ok(c, { message: "OK" }, 201);
  },
);

// GET /api/nav/:navId
publicRoutes.get("/nav/:navId", publicReadLimit, async (c) => {
  const navId = c.req.param("navId");
  if (navId !== "header" && navId !== "footer") {
    return fail(c, 400, "Invalid navId");
  }

  const rows = await getManagedPublicNavItems(navId);
  c.header("Cache-Control", CACHE_STABLE);
  return ok(c, rows);
});

// GET /api/content – list all published pages (slugs + titles, for SSG)
publicRoutes.get("/content", publicReadLimit, async (c) => {
  const rows = await getManagedPublicContentPages();
  c.header("Cache-Control", CACHE_REVALIDATE);
  return ok(c, rows);
});

// GET /api/sponsors – who carries the running costs right now
//
// The amounts never leave the server. What a person gave is needed to say
// whether the year is covered, and for nothing else: an amount printed beside a
// name turns a list of people into a ranking.
publicRoutes.get("/sponsors", publicReadLimit, async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const [current, config] = await Promise.all([
    listCurrentSponsors(sponsorYearStart(today)),
    getSponsoringConfig(),
  ]);

  const costsTotalCents = config.costs.reduce((sum, item) => sum + item.amountCents, 0);
  // Everybody who paid counts towards the year, including whoever asked not to
  // be named: the costs are carried by the money rather than by the mention.
  const coveredCents = current.reduce((sum, sponsor) => sum + sponsor.amountCents, 0);

  // Named against the contract the site reads, so a field renamed on one side
  // cannot quietly go missing on the other. The amounts stay out of it, and so
  // does anybody who does not want to be named.
  const payload: SponsorsPayload = {
    sponsors: current.flatMap((sponsor) =>
      sponsor.published
        ? [
            {
              id: sponsor.id,
              firstName: sponsor.firstName,
              lastName: sponsor.lastName,
              socialMedia: sponsor.socialMedia,
              imageUrl: sponsor.imageUrl,
              claim: sponsor.claim,
              paidAt: sponsor.paidAt,
            },
          ]
        : [],
    ),
    costsTotalCents,
    coveredCents,
    minAmountCents: config.minAmountCents,
  };

  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, payload);
});

// POST /api/sponsorships – what somebody says about themselves before they pay
//
// A transfer carries either a sentence or a reference and never both, so the
// name, the address, the claim and the answer about being named are said here
// and the payment carries only the reference this answers with.
publicRoutes.post(
  "/sponsorships",
  bodyLimit({
    maxSize: PENDING_SPONSORSHIP_BODY_BYTES,
    onError: (c) => fail(c, 413, "Diese Anfrage ist zu gross.", "payload_too_large"),
  }),
  rateLimit({ max: PENDING_SPONSORSHIP_MAX_PER_HOUR, windowMs: 60 * 60 * 1000 }),
  validate("json", pendingSponsorshipInputSchema),
  async (c) => {
    const result = await createPendingSponsorship(c.req.valid("json"));

    if (!result.ok) {
      // Three drawn references in a row were already taken, which at 60 bits
      // says the draw is broken rather than that somebody was unlucky. Nothing
      // the caller typed goes into the line; the request id ties it to the
      // response they hold.
      logger.error(
        { event: "pending_sponsorship.not_created", requestId: c.get("requestId") },
        "No creditor reference could be issued",
      );
      return fail(
        c,
        503,
        "Das hat gerade nicht geklappt. Bitte versuche es in ein paar Minuten noch einmal.",
        "reference_unavailable",
      );
    }

    const receipt: PendingSponsorshipReceipt = {
      reference: result.pending.reference,
      referenceFormatted: formatCreditorReference(result.pending.reference),
    };

    c.header("Cache-Control", CACHE_NONE);
    return ok(c, receipt, 201);
  },
);

// GET /api/support-prompts – what may be shown inside the site today
//
// Only published prompts leave the server, and only those whose window covers
// today. A prompt is rendered in the reader's browser, so anything delivered
// here is readable by anyone, draft or not.
publicRoutes.get("/support-prompts", publicReadLimit, async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const [prompts, limits] = await Promise.all([
    listPublishedSupportPrompts(today),
    getSupportPromptLimits(),
  ]);

  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, { prompts, limits });
});

// GET /api/content/:slug (published pages only)
publicRoutes.get("/content/:slug", publicReadLimit, async (c) => {
  const page = await getManagedPublicContentPageBySlug(c.req.param("slug"));
  if (!page) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", CACHE_REVALIDATE);
  return ok(c, page);
});

// GET /api/content-preview/:token
publicRoutes.get("/content-preview/:token", publicReadLimit, async (c) => {
  const token = c.req.param("token");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return fail(c, 400, "Invalid token");
  }

  const page = getContentPreviewSession(token);
  if (!page) {
    return fail(c, 404, "Preview not found");
  }

  c.header("Cache-Control", CACHE_NONE);
  return ok(c, page);
});

// POST /api/shops/:id/report – dead link report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/report",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Invalid shop id");
    }

    const ip = resolveClientIp(c.req.raw.headers);
    const result = await createManagedDeadLinkReport(id, ip);
    if (!result.ok) {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: "Danke für deinen Hinweis!" });
  },
);

// POST /api/shops/:id/concern – shop concern report (rate limited per IP)
publicRoutes.post(
  "/shops/:id/concern",
  rateLimit({ max: 20, windowMs: 60 * 60 * 1000 }),
  validate("json", concernBodySchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Invalid shop id");
    }

    const { reason } = c.req.valid("json");
    const ip = resolveClientIp(c.req.raw.headers);

    const result = await createManagedShopConcernReport(id, reason, ip);
    if (!result.ok && result.reason === "invalid_reason") {
      return fail(c, 400, "Bitte eine aussagekräftige Begründung angeben (mind. 10 Zeichen).");
    }
    if (!result.ok && result.reason === "not_found") {
      return fail(c, 404, "Shop not found");
    }

    return ok(c, { message: "Danke für dein Feedback!" });
  },
);

// POST /api/shops/:id/like — toggle like counter (rate limited, challenge-token protected)
const likeBodySchema = z.object({
  liked: z.boolean(),
  token: z.string().min(1),
  fingerprint: z.string().trim().min(16).max(256),
});

publicRoutes.post(
  "/shops/:id/like",
  rateLimit({ max: 10, windowMs: 60 * 1000 }),
  validate("json", likeBodySchema),
  async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return fail(c, 400, "Ungültige Shop-ID.");
    }

    const { liked, token, fingerprint } = c.req.valid("json");
    const ip = resolveClientIp(c.req.raw.headers);

    const result = await toggleShopLike(id, liked, token, fingerprint, ip);
    if (!result.ok) {
      if (result.reason === "expired_token") {
        return fail(c, 403, "Der Token ist abgelaufen. Bitte lade die Seite neu.");
      }
      if (result.reason === "invalid_token") {
        return fail(c, 400, "Ungültiger Token.");
      }
      if (result.reason === "not_found") {
        return fail(c, 404, "Shop nicht gefunden.");
      }
      return fail(c, 400, "Ungültige Anfrage.");
    }

    return ok(c, { message: "OK" });
  },
);

// GET /api/form-config/:name — active form configuration for the frontend
publicRoutes.get("/form-config/:name", publicReadLimit, async (c) => {
  const result = await getManagedPublicFormConfig(c.req.param("name"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, result.data);
});

// GET /api/form-config-by-slug/:slug — active form config by frontend URL slug
publicRoutes.get("/form-config-by-slug/:slug", publicReadLimit, async (c) => {
  const result = await getManagedPublicFormConfigBySlug(c.req.param("slug"));
  if (!result.ok) return fail(c, 404, "Form config not found");
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, result.data);
});

// GET /api/footer-config
publicRoutes.get("/footer-config", publicReadLimit, async (c) => {
  const config = await getFooterConfig();
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, config);
});

// GET /api/social-media-accounts/footer
publicRoutes.get("/social-media-accounts/footer", publicReadLimit, async (c) => {
  const accounts = await listFooterSocialMediaAccounts();
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, accounts);
});

// GET /api/social-preview-image – global Open Graph/Twitter preview image
publicRoutes.get("/social-preview-image", publicReadLimit, async (c) => {
  const image = await getSocialPreviewImage();
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, image);
});

// GET /api/markdown-widgets/:key
publicRoutes.get("/markdown-widgets/:key", publicReadLimit, async (c) => {
  const widget = await getEnabledMarkdownWidgetByKey(c.req.param("key"));
  if (!widget) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, widget);
});

// GET /api/footer-preview/:token
publicRoutes.get("/footer-preview/:token", publicReadLimit, async (c) => {
  const token = c.req.param("token");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return fail(c, 400, "Invalid token");
  }

  const config = getFooterPreviewSession(token);
  if (!config) {
    return fail(c, 404, "Preview not found");
  }

  c.header("Cache-Control", CACHE_NONE);
  return ok(c, config);
});

// GET /api/rejected/:token – public rejection reason page
publicRoutes.get("/rejected/:token", publicReadLimit, async (c) => {
  const token = c.req.param("token");
  if (!/^[0-9a-f]{32}$/.test(token)) {
    return fail(c, 400, "Invalid token");
  }

  const page = await getManagedPublicRejectionPageByToken(token);
  if (!page) {
    return fail(c, 404, "Not found");
  }

  c.header("Cache-Control", CACHE_REVALIDATE);
  return ok(c, page);
});

// GET /api/rejected-shops – public transparency list of rejected shops
publicRoutes.get(
  "/rejected-shops",
  publicReadLimit,
  validate("query", rejectedShopsQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await getManagedPublicRejectedShops({
      search: query.q,
      page: query.page,
      pageSize: query.pageSize as PublicRejectedShopPageSize,
      sortBy: query.sortBy as PublicRejectedShopSortField,
      sortDir: query.sortDir as PublicRejectedShopSortDirection,
    });

    c.header("Cache-Control", CACHE_EDITABLE);
    return ok(c, result);
  },
);

// ---------------------------------------------------------------------------
// Filtered endpoints
// ---------------------------------------------------------------------------

// GET /api/filtered/categories?city=&radius=&country=&region=
publicRoutes.get(
  "/filtered/categories",
  publicReadLimit,
  validate("query", shopFilterSchema),
  async (c) => {
    const filters = c.req.valid("query");
    const rows = await getFilteredPublicCategories(filters);
    return ok(c, rows);
  },
);

// GET /api/filtered/categories/:slug?city=&radius=&country=&region=
publicRoutes.get(
  "/filtered/categories/:slug",
  publicReadLimit,
  validate("query", shopFilterSchema),
  async (c) => {
    const slug = c.req.param("slug");
    const filters = c.req.valid("query");
    const result = await getFilteredPublicCategoryBySlug(slug, filters);
    if (!result.ok) {
      return fail(c, 404, "Category not found");
    }
    c.header("Cache-Control", CACHE_PER_VISITOR);
    return ok(c, result.data);
  },
);

// GET /api/filtered/shops?city=&radius=&country=&region=
publicRoutes.get(
  "/filtered/shops",
  publicReadLimit,
  validate("query", shopFilterSchema),
  async (c) => {
    const filters = c.req.valid("query");
    const data = await getFilteredPublicShops(filters);
    return ok(c, data);
  },
);

// GET /api/filtered/search?q=&city=&radius=&country=&region=
publicRoutes.get(
  "/filtered/search",
  publicReadLimit,
  validate("query", shopFilterSchema),
  async (c) => {
    const q = c.req.query("q")?.slice(0, 200);
    const filters = c.req.valid("query");
    const result = await searchFilteredPublicCatalog(q, filters);
    return ok(c, result);
  },
);

// GET /api/filter-options
publicRoutes.get("/filter-options", publicReadLimit, async (c) => {
  const options = await getPublicFilterOptions();
  c.header("Cache-Control", CACHE_STABLE);
  return ok(c, options);
});

// GET /api/media-aliases – alias → public URL map for markdown shortcodes
publicRoutes.get("/media-aliases", publicReadLimit, async (c) => {
  const map = await getMediaAliasMap();
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, map);
});

// GET /api/media-shortcode-assets - alias to public media metadata for markdown shortcodes
publicRoutes.get("/media-shortcode-assets", publicReadLimit, async (c) => {
  const map = await getMediaShortcodeAssetMap();
  c.header("Cache-Control", CACHE_EDITABLE);
  return ok(c, map);
});

// GET /api/hero?state=<visitor-state> -- refresh-count-based hero image rotation
publicRoutes.get("/hero", publicReadLimit, async (c) => {
  const rawState = c.req.query("state") ?? null;
  const image = await getCurrentHeroImage(rawState);
  c.header("Cache-Control", CACHE_NONE);
  return ok(c, image);
});
