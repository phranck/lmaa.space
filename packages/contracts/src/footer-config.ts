import { z } from "zod";

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
    href: z.string(),
    external: z.boolean(),
    style: z.enum(["filled", "outline", "ghost"]),
  })
  .refine((b) => b.label !== undefined || b.icon !== undefined, {
    message: "At least one of label or icon must be set",
  });

export const footerNavBlockSchema = z.object({
  id: z.string(),
  type: z.literal("footer-nav"),
});

export const footerBlockSchema = z.union([
  headlineBlockSchema,
  textBlockSchema,
  buttonBlockSchema,
  footerNavBlockSchema,
]);

export const footerColumnSchema = z.object({
  id: z.string(),
  span: z.number().int().min(1).max(6),
  blocks: z.array(footerBlockSchema),
});

export const footerConfigSchema = z.object({
  columns: z.array(footerColumnSchema),
});

export type HeadlineBlock = z.infer<typeof headlineBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ButtonBlock = z.infer<typeof buttonBlockSchema>;
export type FooterNavBlock = z.infer<typeof footerNavBlockSchema>;
export type FooterBlock = z.infer<typeof footerBlockSchema>;
export type FooterColumn = z.infer<typeof footerColumnSchema>;
export type FooterConfig = z.infer<typeof footerConfigSchema>;
