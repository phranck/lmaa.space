export type MarkdownShortcodeRenderMode = "html" | "widget" | "island";

export type MarkdownShortcodeTargetRule = "required" | "optional" | "forbidden";

export type MarkdownShortcodePlacement = "inline" | "block";

export type MarkdownShortcodeParamType = "boolean" | "enum" | "integer" | "string";

export interface MarkdownShortcodeParamDefinition {
  name: string;
  type: MarkdownShortcodeParamType;
  aliases?: readonly string[];
  defaultValue?: boolean | number | string;
  descriptionKey?: string;
  labelKey?: string;
  max?: number;
  min?: number;
  required?: boolean;
  values?: readonly string[];
}

export interface MarkdownShortcodeDefinition {
  token: string;
  renderMode: MarkdownShortcodeRenderMode;
  target: MarkdownShortcodeTargetRule;
  placement: MarkdownShortcodePlacement;
  examples: readonly string[];
  descriptionKey: string;
  labelKey: string;
  params: readonly MarkdownShortcodeParamDefinition[];
}

export const MARKDOWN_SHORTCODE_TOKENS = {
  widget: "widget",
  image: "image",
  pdf: "pdf",
  hls: "hls",
  youtube: "youtube",
  rejectedShopsTable: "rejected-shops-table",
} as const;

export const MARKDOWN_SHORTCODE_DEFINITIONS = [
  {
    token: MARKDOWN_SHORTCODE_TOKENS.widget,
    renderMode: "widget",
    target: "required",
    placement: "block",
    labelKey: "markdown.shortcodes.widget.label",
    descriptionKey: "markdown.shortcodes.widget.description",
    examples: ["[[widget:key]]"],
    params: [
      {
        name: "title",
        type: "string",
        labelKey: "markdown.shortcodes.params.title.label",
      },
      {
        name: "height",
        type: "integer",
        min: 40,
        max: 2400,
        defaultValue: 320,
        labelKey: "markdown.shortcodes.params.height.label",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.image,
    renderMode: "html",
    target: "required",
    placement: "block",
    labelKey: "markdown.shortcodes.image.label",
    descriptionKey: "markdown.shortcodes.image.description",
    examples: ["[[image:/uploads/...]]"],
    params: [
      {
        name: "alt",
        type: "string",
        labelKey: "markdown.shortcodes.params.alt.label",
      },
      {
        name: "caption",
        type: "string",
        labelKey: "markdown.shortcodes.params.caption.label",
      },
      {
        name: "width",
        type: "integer",
        min: 1,
        max: 4096,
        labelKey: "markdown.shortcodes.params.width.label",
      },
      {
        name: "height",
        type: "integer",
        min: 1,
        max: 4096,
        labelKey: "markdown.shortcodes.params.height.label",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.pdf,
    renderMode: "html",
    target: "required",
    placement: "block",
    labelKey: "markdown.shortcodes.pdf.label",
    descriptionKey: "markdown.shortcodes.pdf.description",
    examples: ["[[pdf:/uploads/...]]"],
    params: [
      {
        name: "label",
        type: "string",
        labelKey: "markdown.shortcodes.params.label.label",
      },
      {
        name: "title",
        type: "string",
        labelKey: "markdown.shortcodes.params.title.label",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.hls,
    renderMode: "html",
    target: "required",
    placement: "block",
    labelKey: "markdown.shortcodes.hls.label",
    descriptionKey: "markdown.shortcodes.hls.description",
    examples: ["[[hls:alias]]"],
    params: [
      {
        name: "title",
        type: "string",
        labelKey: "markdown.shortcodes.params.title.label",
      },
      {
        name: "caption",
        type: "string",
        labelKey: "markdown.shortcodes.params.caption.label",
      },
      {
        name: "aspect",
        type: "string",
        labelKey: "markdown.shortcodes.params.aspect.label",
      },
      {
        name: "poster",
        type: "string",
        labelKey: "markdown.shortcodes.params.poster.label",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.youtube,
    renderMode: "html",
    target: "required",
    placement: "block",
    labelKey: "markdown.shortcodes.youtube.label",
    descriptionKey: "markdown.shortcodes.youtube.description",
    examples: ["[[youtube:url]]"],
    params: [
      {
        name: "title",
        type: "string",
        labelKey: "markdown.shortcodes.params.title.label",
      },
      {
        name: "caption",
        type: "string",
        labelKey: "markdown.shortcodes.params.caption.label",
      },
      {
        name: "aspect",
        type: "string",
        labelKey: "markdown.shortcodes.params.aspect.label",
      },
    ],
  },
  {
    token: MARKDOWN_SHORTCODE_TOKENS.rejectedShopsTable,
    renderMode: "island",
    target: "forbidden",
    placement: "block",
    labelKey: "markdown.shortcodes.rejectedShopsTable.label",
    descriptionKey: "markdown.shortcodes.rejectedShopsTable.description",
    examples: ["[[rejected-shops-table]]"],
    params: [
      {
        name: "pageSize",
        aliases: ["defaultPageSize"],
        type: "enum",
        values: ["10", "15", "20", "30", "50", "all"],
        defaultValue: "15",
        labelKey: "markdown.shortcodes.params.pageSize.label",
      },
      {
        name: "id",
        type: "string",
        labelKey: "markdown.shortcodes.params.id.label",
      },
    ],
  },
] as const satisfies readonly MarkdownShortcodeDefinition[];

export type MarkdownShortcodeDefinitionToken =
  (typeof MARKDOWN_SHORTCODE_DEFINITIONS)[number]["token"];

export function getMarkdownShortcodeDefinition(
  token: string,
): MarkdownShortcodeDefinition | undefined {
  return MARKDOWN_SHORTCODE_DEFINITIONS.find((definition) => definition.token === token);
}

export function getMarkdownShortcodeExamples(): string[] {
  return MARKDOWN_SHORTCODE_DEFINITIONS.flatMap((definition) => definition.examples);
}
