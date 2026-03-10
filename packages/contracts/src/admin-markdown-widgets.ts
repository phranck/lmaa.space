import { z } from "zod";

const widgetKeyPattern = /^[a-z0-9-]+$/;

export const markdownWidgetTypeSchema = z.enum(["html", "iframe"]);

const widgetCspOriginsSchema = z
  .array(z.string().url())
  .max(50)
  .default([])
  .transform((values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]);

export const markdownWidgetSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(80)
      .regex(widgetKeyPattern, "Only lowercase letters, numbers and dashes are allowed"),
    label: z.string().min(1).max(120),
    description: z.string().max(500).optional().default(""),
    enabled: z.boolean().default(true),
    type: markdownWidgetTypeSchema.default("html"),
    defaultHeight: z.coerce.number().int().min(80).max(2400).default(320),
    snippetHtml: z.string().max(50_000).optional().default(""),
    iframeUrl: z.string().url().optional().or(z.literal("")).default(""),
    csp: z
      .object({
        scriptSrc: widgetCspOriginsSchema,
        styleSrc: widgetCspOriginsSchema,
        imgSrc: widgetCspOriginsSchema,
        connectSrc: widgetCspOriginsSchema,
        frameSrc: widgetCspOriginsSchema,
        formAction: widgetCspOriginsSchema,
        fontSrc: widgetCspOriginsSchema,
      })
      .default({
        scriptSrc: [],
        styleSrc: [],
        imgSrc: [],
        connectSrc: [],
        frameSrc: [],
        formAction: [],
        fontSrc: [],
      }),
  })
  .superRefine((widget, ctx) => {
    if (widget.type === "html" && widget.snippetHtml.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snippetHtml"],
        message: "HTML widgets need an HTML snippet",
      });
    }

    if (widget.type === "iframe" && widget.iframeUrl.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["iframeUrl"],
        message: "Iframe widgets need a URL",
      });
    }
  });

export const markdownWidgetsConfigSchema = z.object({
  widgets: z
    .array(markdownWidgetSchema)
    .max(200)
    .superRefine((widgets, ctx) => {
      const seen = new Set<string>();
      widgets.forEach((widget, index) => {
        if (seen.has(widget.key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "key"],
            message: "Widget keys must be unique",
          });
          return;
        }

        seen.add(widget.key);
      });
    }),
});

export type MarkdownWidget = z.infer<typeof markdownWidgetSchema>;
export type MarkdownWidgetsConfig = z.infer<typeof markdownWidgetsConfigSchema>;
