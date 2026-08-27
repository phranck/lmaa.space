import { z } from "zod";

import { isSafeConfiguredUrl } from "./safe-url";

/**
 * Support prompts, the short asks that appear inside the site rather than on a
 * page of their own.
 *
 * A prompt is content: it is written in the ordinary Markdown editor, it names
 * one of a fixed set of slots, and it carries the rules that decide when it may
 * appear. The rules that bound what one reader sees across all prompts together
 * live beside them as limits, because a ceiling that each prompt could raise
 * would bound nothing.
 */

/**
 * The places on the site that render a prompt.
 *
 * A slot is a contract a page honours, so a prompt cannot turn up somewhere
 * nobody planned for. Adding one is a line here plus the place in the page.
 *
 * The slot also decides how the prompt is drawn. A prompt among shop cards is a
 * shop card and one among category cards is a category card, so the form
 * follows from the place rather than being chosen beside it.
 */
export const SUPPORT_PROMPT_SLOTS = ["my-shops", "shop-detail", "category-grid"] as const;

/** One of the places a prompt may appear. */
export const supportPromptSlotSchema = z.enum(SUPPORT_PROMPT_SLOTS);

/**
 * Where a prompt's invitation stands in its card.
 *
 * Named as the stacks name it, so one vocabulary covers everything on the site
 * that places something along an axis.
 */
export const SUPPORT_PROMPT_BUTTON_ALIGNMENTS = ["leading", "center", "trailing"] as const;

/** Where a prompt's invitation stands. */
export const supportPromptButtonAlignmentSchema = z.enum(SUPPORT_PROMPT_BUTTON_ALIGNMENTS);

/**
 * Which of the reader's own counters a threshold is measured against.
 *
 * `viewed` counts the shop pages somebody has seen, once per shop rather than
 * once per reload. `liked` counts the shops they have kept. Both live in the
 * reader's browser and neither leaves it.
 */
export const SUPPORT_PROMPT_THRESHOLD_BASES = ["viewed", "liked"] as const;

/** Which counter a threshold reads. */
export const supportPromptThresholdBasisSchema = z.enum(SUPPORT_PROMPT_THRESHOLD_BASES);

/** Where a prompt's main button may lead: this site, or an ordinary web address. */
const promptHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => isSafeConfiguredUrl(value, { allowRelative: true }), {
    message: "Only https addresses or paths on this site are allowed",
  });

/** An optional day, as `YYYY-MM-DD`, or nothing at all. */
const optionalDaySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a day as YYYY-MM-DD")
  .nullable()
  .default(null);

/** Everything an editor decides about one prompt. */
export const supportPromptInputSchema = z
  .object({
    /** Internal, for the list in the dashboard. A visitor never sees it. */
    name: z.string().trim().min(1).max(120),
    slot: supportPromptSlotSchema,
    /**
     * Markdown, rendered through the same pipeline as a page. `{shops}` and
     * `{views}` are replaced by what the reader has actually done.
     */
    content: z.string().max(20_000).default(""),
    buttonLabel: z.string().trim().max(120).default(""),
    buttonHref: promptHrefSchema.default("/support-me"),
    buttonAlignment: supportPromptButtonAlignmentSchema.default("trailing"),
    /** From how many shops on, counted by `thresholdBasis`. Zero means at once. */
    threshold: z.coerce.number().int().min(0).max(500).default(3),
    thresholdBasis: supportPromptThresholdBasisSchema.default("viewed"),
    startsAt: optionalDaySchema,
    endsAt: optionalDaySchema,
    /** Decides between two prompts that both qualify. Higher wins. */
    priority: z.coerce.number().int().min(0).max(1000).default(0),
    /**
     * Unpublished prompts are not delivered at all. A prompt is rendered in the
     * reader's browser, so a draft that travelled with the page would be
     * readable in the network traffic.
     */
    published: z.boolean().default(false),
  })
  .superRefine((prompt, ctx) => {
    if (prompt.buttonLabel.trim() !== "" && prompt.buttonHref.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buttonHref"],
        message: "A button needs somewhere to lead",
      });
    }

    if (prompt.startsAt && prompt.endsAt && prompt.endsAt < prompt.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "The window ends before it starts",
      });
    }
  });

/** A prompt as it is stored and read back. */
export const supportPromptSchema = z.object({
  /**
   * Stable for the life of the prompt. The reader's own counters are keyed by
   * it, so renaming a prompt must never reset anybody.
   */
  id: z.string().min(1).max(64),
  name: z.string(),
  slot: supportPromptSlotSchema,
  content: z.string(),
  buttonLabel: z.string(),
  buttonHref: z.string(),
  buttonAlignment: supportPromptButtonAlignmentSchema,
  threshold: z.number().int(),
  thresholdBasis: supportPromptThresholdBasisSchema,
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  priority: z.number().int(),
  published: z.boolean(),
  updatedAt: z.string(),
});

/**
 * What bounds one reader across every prompt together.
 *
 * The figure of four comes from Wikimedia's own measurement: over 75 per cent
 * of donors give on the first or second showing, and from the tenth on
 * practically nobody does. No prompt may raise these, which is why they live
 * here and not on a prompt.
 */
export const supportPromptLimitsSchema = z.object({
  /** How often anything may be shown to one reader, in total. */
  maxShown: z.coerce.number().int().min(1).max(20).default(4),
  /** How long the site stays quiet after a showing. Zero means not at all. */
  snoozeDays: z.coerce.number().int().min(0).max(365).default(14),
  /**
   * Whether to set every limit aside whilst working on a prompt.
   *
   * Stored like the others, but only ever acted on outside production. See
   * `supportPromptPayloadSchema`.
   */
  devAlwaysShow: z.boolean().default(false),
});

/** What the site needs to decide what to show. */
export const supportPromptPayloadSchema = z.object({
  prompts: z.array(supportPromptSchema),
  limits: supportPromptLimitsSchema,
  /**
   * Whether every limit is set aside, so a prompt shows on every page view.
   *
   * For working on a prompt: with the ordinary rules in force, seeing one twice
   * means clearing the browser store and visiting three shops in between, which
   * makes trying a change out slower than making it.
   *
   * The backend answers `false` in production whatever is stored, so this can
   * never reach a reader. The decision is made there rather than in the browser
   * because that is where the environment is known for certain.
   */
  devAlwaysShow: z.boolean().default(false),
});

/** One of the places a prompt may appear. */
export type SupportPromptSlot = z.infer<typeof supportPromptSlotSchema>;
/** Where a prompt's invitation stands. */
export type SupportPromptButtonAlignment = z.infer<typeof supportPromptButtonAlignmentSchema>;
/** Which counter a threshold reads. */
export type SupportPromptThresholdBasis = z.infer<typeof supportPromptThresholdBasisSchema>;
/** Everything an editor decides about one prompt. */
export type SupportPromptInput = z.infer<typeof supportPromptInputSchema>;
/** A prompt as it is stored and read back. */
export type SupportPrompt = z.infer<typeof supportPromptSchema>;
/** What bounds one reader across every prompt together. */
export type SupportPromptLimits = z.infer<typeof supportPromptLimitsSchema>;
/** What the site needs to decide what to show. */
export type SupportPromptPayload = z.infer<typeof supportPromptPayloadSchema>;

/** The limits in force when nothing has been configured. */
export const SUPPORT_PROMPT_LIMIT_DEFAULTS: SupportPromptLimits =
  supportPromptLimitsSchema.parse({});
