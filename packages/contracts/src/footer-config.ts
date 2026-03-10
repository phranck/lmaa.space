import { z } from "zod";

import { isSafeConfiguredUrl } from "./safe-url.js";

// ---------------------------------------------------------------------------
// Style
// ---------------------------------------------------------------------------

export const footerStyleSchema = z.object({
  bgColor: z.string().default("#1c1917"),
  textColor: z.string().default("#d6d3d1"),
  headlineColor: z.string().default("#78716c"),
  linkColor: z.string().default("#a8a29e"),
  linkHoverColor: z.string().default("#fbbf24"),
  buttonColor: z.string().default("#7c3aed"),
  buttonTextColor: z.string().default("#ffffff"),
  height: z.enum(["sm", "md", "lg", "xl"]).default("md"),
  paddingY: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
});

export type FooterStyle = z.infer<typeof footerStyleSchema>;

export const FOOTER_STYLE_DEFAULTS: FooterStyle = footerStyleSchema.parse({});

export const FOOTER_PADDING_Y: Record<FooterStyle["paddingY"], string> = {
  sm: "2rem",
  md: "2.75rem",
  lg: "3.5rem",
  xl: "5rem",
};

export const FOOTER_HEIGHTS: Record<FooterStyle["height"], string> = {
  sm: "240px",
  md: "320px",
  lg: "420px",
  xl: "560px",
};

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export const headlineBlockSchema = z.object({
  id: z.string(),
  type: z.literal("headline"),
  text: z.string(),
});

export const textBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  markdown: z.string(),
});

export const buttonBlockSchema = z
  .object({
    id: z.string(),
    type: z.literal("button"),
    label: z.string().optional(),
    icon: z.string().optional(),
    href: z.string().refine((value) => isSafeConfiguredUrl(value, { allowRelative: true, allowMailto: true }), {
      message: "href must be a relative path or a safe URL",
    }),
    external: z.boolean(),
    style: z.enum(["filled", "outline", "ghost"]),
  })
  .refine((b) => b.label !== undefined || b.icon !== undefined, {
    message: "At least one of label or icon must be set",
  });

export const footerNavBlockSchema = z.object({
  id: z.string(),
  type: z.literal("footer-nav"),
  direction: z.enum(["horizontal", "vertical"]).default("vertical"),
});

export const separatorBlockSchema = z.object({
  id: z.string(),
  type: z.literal("separator"),
});

export const footerBlockSchema = z.union([
  headlineBlockSchema,
  textBlockSchema,
  buttonBlockSchema,
  footerNavBlockSchema,
  separatorBlockSchema,
]);

// ---------------------------------------------------------------------------
// Column + Config
// ---------------------------------------------------------------------------

export const footerColumnSchema = z.object({
  id: z.string(),
  span: z.number().int().min(1).max(6),
  blocks: z.array(footerBlockSchema),
});

export const footerConfigSchema = z.object({
  columns: z.array(footerColumnSchema),
  style: footerStyleSchema.optional(),
});

export type HeadlineBlock = z.infer<typeof headlineBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ButtonBlock = z.infer<typeof buttonBlockSchema>;
export type FooterNavBlock = z.infer<typeof footerNavBlockSchema>;
export type SeparatorBlock = z.infer<typeof separatorBlockSchema>;
export type FooterBlock = z.infer<typeof footerBlockSchema>;
export type FooterColumn = z.infer<typeof footerColumnSchema>;
export type FooterConfig = z.infer<typeof footerConfigSchema>;
