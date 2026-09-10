export type MarkdownShortcodeRenderMode = "html" | "island";

export type MarkdownShortcodeTargetRule = "required" | "optional" | "forbidden";

export type MarkdownShortcodePlacement = "inline" | "block";

/**
 * Whether a shortcode carries content between braces.
 *
 * `markdown` is a container: what stands inside it is page content and is
 * rendered exactly as the page around it, so any shortcode and any markup may
 * stand there, including another container. `forbidden` is everything else,
 * which draws one thing from its attributes alone.
 */
export type MarkdownShortcodeBodyRule = "forbidden" | "markdown";

export type MarkdownShortcodeParamType = "boolean" | "enum" | "integer" | "string";

/**
 * A name in braces that one attribute's value accepts, and nothing else does.
 *
 * Three kinds of `{name}` are written in this project and they look identical
 * to whoever is typing. A site variable works in any text and is expanded
 * before the page is parsed. A text token works in a form field and nowhere
 * else. This is the third: a name that means something inside one attribute of
 * one shortcode, substituted by that shortcode's own renderer against a figure
 * only it holds.
 *
 * Declared here rather than described in the attribute's label, so the
 * reference panel can render it the way it renders everything else instead of
 * hiding it in a sentence somebody has to open the shortcode to read.
 */
export interface MarkdownShortcodePlaceholder {
  /** The name, without its braces. */
  name: string;
  /**
   * What is put in its place, in the words an editor would use.
   *
   * Written to follow "wird ersetzt durch", which is how the reference panel
   * renders it, so it begins in lower case and in the accusative.
   */
  description: string;
}

export interface MarkdownShortcodeParamDefinition {
  name: string;
  type: MarkdownShortcodeParamType;
  aliases?: readonly string[];
  defaultValue?: boolean | number | string;
  /**
   * What holds when the parameter is left out, where that is not a value the
   * parser can supply.
   *
   * Some defaults are decided further down than the parser: by the renderer, or
   * by the stylesheet. Naming them here would state them twice, so what goes in
   * is either a sentence saying what happens, or the custom property that
   * carries the value. A `var(--…)` is resolved against the page and shown in
   * pixels, so the reference states the figure without holding a copy of it.
   */
  defaultLabel?: string;
  /** Human name of the parameter, shown in the editor's reference. */
  label?: string;
  /**
   * Names this attribute's value accepts, each substituted by this shortcode
   * and by nothing else. Absent where the value is taken as it stands.
   */
  placeholders?: readonly MarkdownShortcodePlaceholder[];
  max?: number;
  min?: number;
  required?: boolean;
  values?: readonly string[];
}

/**
 * A table shown in the editor's reference under a shortcode's parameter list.
 *
 * For the few parameters whose values are easier to look up than to describe,
 * such as the nine alignments an icon knows. A sentence naming all of them is
 * one nobody reads twice.
 */
export interface MarkdownShortcodeTable {
  /** What the table answers, shown above it. */
  caption: string;
  /** The column headings, left to right. */
  columns: readonly string[];
  /** One entry per row, each holding as many cells as there are columns. */
  rows: readonly (readonly string[])[];
}

export interface MarkdownShortcodeDefinition {
  token: string;
  renderMode: MarkdownShortcodeRenderMode;
  target: MarkdownShortcodeTargetRule;
  placement: MarkdownShortcodePlacement;
  examples: readonly string[];
  /** Human name of the shortcode, shown in the editor's reference. */
  label: string;
  /** What it does, in one or two sentences, shown beside the name. */
  description: string;
  params: readonly MarkdownShortcodeParamDefinition[];
  /**
   * Whether the shortcode carries content between braces.
   *
   * Absent means `forbidden`, which is what every shortcode was before
   * containers existed.
   */
  body?: MarkdownShortcodeBodyRule;
  /** Value tables shown under the parameter list, where one helps. */
  tables?: readonly MarkdownShortcodeTable[];
  /**
   * Nodes that may appear inside this one.
   *
   * A child token is resolved against this list rather than against the
   * document's, so `option` means something inside `interval` and nothing at
   * the top level. A definition without children is a leaf, which is what every
   * shortcode was before nesting existed.
   */
  children?: readonly MarkdownShortcodeDefinition[];
}
