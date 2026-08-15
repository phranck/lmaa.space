import { z } from "zod";

import { REGION_CODES, socialMediaSchema } from "@lmaa/shared";

import { isSafeConfiguredUrl } from "./safe-url";

/**
 * Version of this result contract.
 *
 * @remarks
 * Persisted with every review job. A worker refuses to apply a result whose
 * version it does not know, which is what stops an old provider response from
 * being interpreted against newer rules after a deployment.
 */
export const REVIEW_RESULT_SCHEMA_VERSION = "1";

/**
 * Placeholder the rejection comment must still contain when it reaches us.
 *
 * @remarks
 * The public rejection token is generated in the backend. The provider only
 * ever sees and returns this placeholder, so a result carrying anything else in
 * its place is treated as invalid rather than trusted.
 */
export const REJECT_TOKEN_PLACEHOLDER = "[REJECT_TOKEN]";

/** Minimum number of independently verifiable sources a rejection must cite. */
export const REJECTION_MIN_SOURCES = 5;

const MIN_REJECTION_WORDS = 200;
const MAX_REJECTION_WORDS = 800;

const publicUrl = z
  .string()
  .trim()
  .url()
  .max(2000)
  .refine((value) => isSafeConfiguredUrl(value), "URL must be a public http(s) address");

/**
 * Rejects the punctuation and glyphs the canonical rules forbid in published
 * German text.
 *
 * @remarks
 * Only the mechanical rules are checked here. Dashes and gender glyphs are
 * detectable; tone, gender-neutral phrasing and correct umlauts are not, and a
 * validator that pretended otherwise would reject good text and pass bad text.
 */
function assertGermanTextRules(value: string, ctx: z.RefinementCtx, field: string): void {
  if (/[—–]/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must not contain em-dashes or en-dashes`,
    });
  }
  if (/[*:]innen\b/i.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must not use gender-star or gender-colon glyphs`,
    });
  }
}

function countWords(value: string): number {
  const matches = value.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * How one admission criterion was rated.
 *
 * @remarks
 * Mirrors the `✓`, `✗`, `~` scale of the canonical rules. `unclear` is what
 * routes a check to `onhold` instead of to a guessed verdict.
 */
export const criterionRatingSchema = z.enum(["pass", "fail", "unclear"]);

/**
 * The eight admission criteria, each rated once.
 *
 * @remarks
 * The keys follow the order of the canonical criteria list so a reviewer can
 * compare a machine result against the published criteria line by line.
 */
export const reviewCriteriaSchema = z
  .object({
    independentOnlinePresence: criterionRatingSchema,
    sellsToEurope: criterionRatingSchema,
    notALargeCompany: criterionRatingSchema,
    notAMarketplace: criterionRatingSchema,
    notDropshipping: criterionRatingSchema,
    notAChain: criterionRatingSchema,
    notAnAffiliatePortal: criterionRatingSchema,
    noFarRightTies: criterionRatingSchema,
  })
  .strict();

/**
 * Evidence the review actually retrieved, one entry per source.
 */
export const reviewEvidenceSchema = z
  .object({
    url: publicUrl,
    label: z.string().trim().min(1).max(200),
    retrievedAt: z.string().datetime(),
  })
  .strict();

/**
 * Result of the mandatory company-size research.
 *
 * @remarks
 * Headcount is the leading signal in the canonical rules, so a run that found
 * no figure has to say what it judged from instead. That is why `assessment`
 * grows a minimum length exactly when `employees` is absent.
 */
export const companySizeSchema = z
  .object({
    employees: z.number().int().nonnegative().max(10_000_000).nullable(),
    revenueEur: z.number().nonnegative().nullable(),
    referenceYear: z.number().int().min(1900).max(2100).nullable(),
    isEstimate: z.boolean(),
    sources: z.array(publicUrl).max(10),
    assessment: z.string().trim().min(1).max(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.employees === null && value.assessment.length < 40) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessment"],
        message:
          "assessment must explain the proxies used when no employee figure could be sourced",
      });
    }
  });

/**
 * A trimmed string that may be absent.
 *
 * @remarks
 * Absent rather than `null`, because a provider schema may carry at most
 * sixteen union-typed parameters and every nullable field spends one. `null` is
 * kept only where it means something the absence of a key would not, such as a
 * company size that was searched for and not found.
 */
const optionalTrimmed = (max: number) => z.string().trim().max(max).nullish();

/**
 * Structured headquarters address, as the canonical rules define it.
 */
export const acceptHeadquartersSchema = z
  .object({
    street: optionalTrimmed(200),
    postalCode: optionalTrimmed(32),
    city: optionalTrimmed(120),
    state: optionalTrimmed(120),
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "countryCode must be an ISO 3166-1 alpha-2 code")
      .nullish(),
    source: z.string().trim().min(1).max(200),
  })
  .strict();

/**
 * Resolved coordinates for the headquarters.
 *
 * @remarks
 * The canonical rules allow `null` coordinates only after the whole fallback
 * cascade has failed, so an unresolved pair has to name the reason. Without
 * that, an acceptance with no map position would look identical to one where
 * geocoding was never attempted.
 */
export const acceptGeoSchema = z
  .object({
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    source: z.string().trim().min(1).max(200),
    unresolvedReason: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasBoth = value.latitude !== null && value.longitude !== null;
    const hasNeither = value.latitude === null && value.longitude === null;
    if (!hasBoth && !hasNeither) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude and longitude must both be present or both be null",
      });
    }
    if (hasNeither && !value.unresolvedReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unresolvedReason"],
        message: "unresolved coordinates must state why the geocoding cascade failed",
      });
    }
  });

const regionCodeSchema = z.enum(REGION_CODES);

/**
 * Shipping regions in the canonical form the dashboard selector uses.
 */
export const shippingRegionsSchema = z
  .array(regionCodeSchema)
  .min(1)
  .max(REGION_CODES.length)
  .superRefine((value, ctx) => {
    const unique = new Set(value);
    if (unique.size !== value.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "shippingRegions must not repeat" });
    }
    if (unique.has("WORLD") && unique.size > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WORLD must not be combined with another region",
      });
    }
    if (unique.has("EU") && (unique.has("DE") || unique.has("AT") || unique.has("CH"))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "EU must not be combined with DE, AT or CH",
      });
    }
  });

/**
 * The acceptance payload, which is the shop-check JSON the manual path already
 * produces.
 *
 * @remarks
 * Deliberately shaped so `mapShopJsonToShopData` consumes it unchanged. A
 * second mapper for the automated path would be the same mapping written twice,
 * and the two would drift the first time a field is added.
 */
export const reviewAcceptSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    url: publicUrl,
    description: z.string().trim().min(1).max(8000),
    categories: z.array(z.string().trim().min(1).max(120)).max(20),
    /**
     * Payment methods the shop evidences, as it names them.
     *
     * @remarks
     * Free text rather than an enum on purpose. The canonical keys live in
     * `@lmaa/shared`, and `normalizePaymentMethods` already maps what a footer
     * actually says onto them and drops the rest. Validating against the enum
     * here means one unfamiliar label voids the whole check, which is what
     * happened once and cost a full run.
     */
    paymentMethods: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    contactEmail: z.string().trim().email().max(200).nullish(),
    shippingRegions: shippingRegionsSchema,
    legal: z
      .object({
        entityName: optionalTrimmed(300),
        entityType: optionalTrimmed(120),
        owners: z.array(z.string().trim().min(1).max(200)).max(20),
        headquartersSource: optionalTrimmed(200),
      })
      .strict(),
    headquarters: acceptHeadquartersSchema,
    geo: acceptGeoSchema,
    socialMedia: z.preprocess((raw) => {
      // The provider lists only the profiles it found, as `[{platform, url}]`.
      // The rest of the code works with a record, so the list is folded into
      // one here and the canonical social-media validation runs on that.
      if (Array.isArray(raw)) {
        const record: Record<string, string> = {};
        for (const entry of raw) {
          if (typeof entry !== "object" || entry === null) continue;
          const platform = (entry as { platform?: unknown }).platform;
          const url = (entry as { url?: unknown }).url;
          if (typeof platform === "string" && typeof url === "string" && url.trim() !== "") {
            record[platform] = url;
          }
        }
        return record;
      }
      if (raw === null || raw === undefined) return {};
      if (typeof raw !== "object") return raw;
      return Object.fromEntries(
        Object.entries(raw as Record<string, unknown>).filter(
          ([, value]) => typeof value === "string" && value.trim() !== "",
        ),
      );
    }, socialMediaSchema),
    notes: z
      .object({
        focus: z.array(z.string().trim().min(1).max(200)).max(30),
        brandsOrProducts: z.array(z.string().trim().min(1).max(200)).max(50),
        companyPresentation: optionalTrimmed(4000),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertGermanTextRules(value.description, ctx, "description");
  });

/**
 * The rejection payload, carrying both texts the public rejection page needs.
 *
 * @remarks
 * The word bounds are wider than the 300 to 500 words the canonical rules ask
 * for. A text that lands slightly outside is still a usable rejection a human
 * can trim, whilst a text of eighty words is not, and failing the whole check
 * over twenty words would throw away the entire research run.
 */
export const reviewRejectSchema = z
  .object({
    comment: z.string().trim().min(50).max(4000),
    longText: z.string().trim().min(1).max(40_000),
    sources: z.array(publicUrl).min(REJECTION_MIN_SOURCES).max(30),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertGermanTextRules(value.comment, ctx, "comment");
    assertGermanTextRules(value.longText, ctx, "longText");

    if (!value.comment.includes(REJECT_TOKEN_PLACEHOLDER)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: `comment must keep the ${REJECT_TOKEN_PLACEHOLDER} placeholder intact`,
      });
    }

    if (/\/rejected\/[0-9a-f]{16,}/i.test(value.comment)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: "comment must not contain a rejection token; the backend generates it",
      });
    }

    const words = countWords(value.longText);
    if (words < MIN_REJECTION_WORDS || words > MAX_REJECTION_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["longText"],
        message: `longText must hold between ${MIN_REJECTION_WORDS} and ${MAX_REJECTION_WORDS} words, found ${words}`,
      });
    }

    const unique = new Set(value.sources.map((source) => source.toLowerCase()));
    if (unique.size < REJECTION_MIN_SOURCES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sources"],
        message: `rejection needs at least ${REJECTION_MIN_SOURCES} distinct sources, found ${unique.size}`,
      });
    }
  });

/**
 * The on-hold payload, used whenever the evidence does not support a decision.
 */
export const reviewOnholdSchema = z
  .object({
    reason: z.string().trim().min(20).max(4000),
    missing: z.array(z.string().trim().min(1).max(300)).max(20),
  })
  .strict();

/**
 * A complete automated review result.
 *
 * @remarks
 * The verdict decides which payload must be present, and the other two must be
 * absent. Carrying an acceptance payload alongside a rejection would leave the
 * applying code to pick one, which is exactly the ambiguity `onhold` exists to
 * prevent.
 */
export const reviewResultSchema = z
  .object({
    schemaVersion: z.literal(REVIEW_RESULT_SCHEMA_VERSION),
    verdict: z.enum(["accept", "reject", "onhold"]),
    criteria: reviewCriteriaSchema,
    companySize: companySizeSchema,
    evidence: z.array(reviewEvidenceSchema).min(1).max(60),
    uncertainties: z.array(z.string().trim().min(1).max(500)).max(20),
    accept: reviewAcceptSchema.nullish(),
    reject: reviewRejectSchema.nullish(),
    onhold: reviewOnholdSchema.nullish(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const payloads = {
      accept: value.accept,
      reject: value.reject,
      onhold: value.onhold,
    } as const;

    for (const [verdict, payload] of Object.entries(payloads)) {
      const required = verdict === value.verdict;
      // `null` and an absent key both mean "this verdict was not chosen". The
      // provider schema requires all three keys and nulls the two that do not
      // apply, whilst a hand-written fixture may simply omit them.
      if (required && payload == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [verdict],
          message: `verdict "${value.verdict}" requires the ${verdict} payload`,
        });
      }
      if (!required && payload != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [verdict],
          message: `verdict "${value.verdict}" must not carry the ${verdict} payload`,
        });
      }
    }

    if (value.verdict === "accept") {
      const failed = Object.entries(value.criteria).filter(([, rating]) => rating === "fail");
      if (failed.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["criteria"],
          message: `acceptance contradicts failed criteria: ${failed.map(([key]) => key).join(", ")}`,
        });
      }
      const unclear = Object.entries(value.criteria).filter(([, rating]) => rating === "unclear");
      if (unclear.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["criteria"],
          message: `unclear criteria must resolve to onhold, not acceptance: ${unclear
            .map(([key]) => key)
            .join(", ")}`,
        });
      }
    }

    if (value.verdict === "reject") {
      const failed = Object.values(value.criteria).some((rating) => rating === "fail");
      if (!failed) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["criteria"],
          message: "rejection requires at least one criterion rated fail",
        });
      }
    }
  });

/**
 * A validated automated review result.
 */
export type ReviewResult = z.infer<typeof reviewResultSchema>;

/**
 * A validated acceptance payload, shaped like the shop-check JSON.
 */
export type ReviewAcceptPayload = z.infer<typeof reviewAcceptSchema>;

/**
 * A validated rejection payload.
 */
export type ReviewRejectPayload = z.infer<typeof reviewRejectSchema>;

// ---------------------------------------------------------------------------
// Provider-facing JSON Schema
// ---------------------------------------------------------------------------

/**
 * Social platforms a review result may report a profile for.
 *
 * @remarks
 * The list matches the platforms named in the canonical rules. It is stated
 * here because a provider schema may not leave an object open, and a closed
 * list also keeps a result from inventing a platform the shop model cannot
 * store.
 */
export const REVIEW_SOCIAL_PLATFORMS = [
  "mastodon",
  "bluesky",
  "twitter",
  "instagram",
  "tiktok",
  "youtube",
  "twitch",
  "pinterest",
  "linkedin",
  "facebook",
  "threads",
  "patreon",
] as const;

// The schema travels in the prompt rather than being compiled into a grammar,
// so an enumeration costs nothing here and is what keeps a value from being
// invented. A value outside the set fails `reviewResultSchema` and throws away
// the whole run, which is far more expensive than naming the options.
const ratingEnum = { type: "string", enum: ["pass", "fail", "unclear"] } as const;

/**
 * Structural schema handed to the provider so the answer parses.
 *
 * @remarks
 * This pins the shape: which keys exist, which are required, and which values
 * are drawn from a fixed set. It deliberately says nothing about lengths, word
 * counts, uniqueness or the relationship between the verdict and its payload,
 * because a JSON Schema cannot express those and
 * {@link reviewResultSchema} already does. The two are not competing answers to
 * one question: this one constrains generation, the Zod contract decides
 * whether a generated result may be applied.
 *
 * All three payload keys are required and the two that do not apply are `null`.
 * Making them optional would let a model omit the one it was supposed to fill
 * and still produce a structurally valid answer.
 *
 * A test asserts that the property names here and in the Zod contract match, so
 * a field added to one is not silently missing from the other.
 */
export const reviewResultJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  // Only what every result carries is required. The three payloads are optional
  // rather than nullable, and a field whose absence says the same thing as
  // `null` is optional too, because a provider schema may carry at most sixteen
  // union-typed parameters and every nullable field spends one of them.
  required: ["schemaVersion", "verdict", "criteria", "companySize", "evidence", "uncertainties"],
  properties: {
    schemaVersion: { type: "string", enum: [REVIEW_RESULT_SCHEMA_VERSION] },
    verdict: { type: "string", enum: ["accept", "reject", "onhold"] },
    criteria: {
      type: "object",
      additionalProperties: false,
      required: [
        "independentOnlinePresence",
        "sellsToEurope",
        "notALargeCompany",
        "notAMarketplace",
        "notDropshipping",
        "notAChain",
        "notAnAffiliatePortal",
        "noFarRightTies",
      ],
      properties: {
        independentOnlinePresence: ratingEnum,
        sellsToEurope: ratingEnum,
        notALargeCompany: ratingEnum,
        notAMarketplace: ratingEnum,
        notDropshipping: ratingEnum,
        notAChain: ratingEnum,
        notAnAffiliatePortal: ratingEnum,
        noFarRightTies: ratingEnum,
      },
    },
    companySize: {
      type: "object",
      additionalProperties: false,
      required: ["employees", "revenueEur", "referenceYear", "isEstimate", "sources", "assessment"],
      properties: {
        // These three stay nullable: a figure that was searched for and not
        // found says something an absent key would not.
        employees: { type: ["integer", "null"] },
        revenueEur: { type: ["number", "null"] },
        referenceYear: { type: ["integer", "null"] },
        isEstimate: { type: "boolean" },
        sources: { type: "array", items: { type: "string" } },
        assessment: { type: "string" },
      },
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "label", "retrievedAt"],
        properties: {
          url: { type: "string" },
          label: { type: "string" },
          retrievedAt: { type: "string", format: "date-time" },
        },
      },
    },
    uncertainties: { type: "array", items: { type: "string" } },
    accept: {
      type: "object",
      additionalProperties: false,
      required: [
        "name",
        "url",
        "description",
        "categories",
        "paymentMethods",
        "shippingRegions",
        "legal",
        "headquarters",
        "geo",
        "socialMedia",
        "notes",
      ],
      properties: {
        name: { type: "string" },
        url: { type: "string" },
        description: { type: "string" },
        categories: { type: "array", items: { type: "string" } },
        paymentMethods: {
          type: "array",
          items: { type: "string" },
          description:
            "Belegte Zahlungsarten mit den kanonischen Schlüsseln aus Schritt 5 des Ablaufs. Leeres Feld, wenn keine belegbar ist.",
        },
        contactEmail: { type: "string" },
        shippingRegions: { type: "array", items: { type: "string", enum: [...REGION_CODES] } },
        legal: {
          type: "object",
          additionalProperties: false,
          required: ["owners"],
          properties: {
            entityName: { type: "string" },
            entityType: { type: "string" },
            owners: { type: "array", items: { type: "string" } },
            headquartersSource: { type: "string" },
          },
        },
        headquarters: {
          type: "object",
          additionalProperties: false,
          required: ["source"],
          properties: {
            street: { type: "string" },
            postalCode: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            countryCode: { type: "string" },
            source: { type: "string" },
          },
        },
        geo: {
          type: "object",
          additionalProperties: false,
          required: ["latitude", "longitude", "source"],
          properties: {
            // Both stay nullable, because the rules allow unresolved
            // coordinates only together with a stated reason, and an absent
            // pair could not be told apart from one nobody looked for.
            latitude: { type: ["number", "null"] },
            longitude: { type: ["number", "null"] },
            source: { type: "string" },
            unresolvedReason: { type: "string" },
          },
        },
        socialMedia: {
          // A list of what was found, rather than an object that nulls out
          // every platform that was not. Twelve nullable fields alone would
          // have used up three quarters of the union budget.
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["platform", "url"],
            properties: {
              platform: { type: "string", enum: [...REVIEW_SOCIAL_PLATFORMS] },
              url: { type: "string" },
            },
          },
        },
        notes: {
          type: "object",
          additionalProperties: false,
          required: ["focus", "brandsOrProducts"],
          properties: {
            focus: { type: "array", items: { type: "string" } },
            brandsOrProducts: { type: "array", items: { type: "string" } },
            companyPresentation: { type: "string" },
          },
        },
      },
    },
    reject: {
      type: "object",
      additionalProperties: false,
      required: ["comment", "longText", "sources"],
      properties: {
        comment: { type: "string" },
        longText: { type: "string" },
        sources: { type: "array", items: { type: "string" } },
      },
    },
    onhold: {
      type: "object",
      additionalProperties: false,
      required: ["reason", "missing"],
      properties: {
        reason: { type: "string" },
        missing: { type: "array", items: { type: "string" } },
      },
    },
  },
};
