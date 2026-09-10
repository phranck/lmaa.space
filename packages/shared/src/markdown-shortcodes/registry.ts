import { REJECTED_SHOPS_TABLE_SHORTCODE, SPONSORS_SHORTCODE } from "./data-blocks.js";
import { HSTACK_SHORTCODE, ICON_SHORTCODE, SPACER_SHORTCODE, VSTACK_SHORTCODE } from "./layout.js";
import { HLS_SHORTCODE, IMAGE_SHORTCODE, PDF_SHORTCODE, YOUTUBE_SHORTCODE } from "./media.js";
import { SUPPORT_LADDER_SHORTCODE } from "./support-ladder.js";
import type { MarkdownShortcodeDefinition } from "./types.js";

/**
 * Every shortcode a page may use, in the order the editor's reference lists
 * them.
 *
 * The order is the reference panel's, so the ones an author reaches for while
 * laying out a page come before the ones that embed something, and the two
 * large islands come last.
 */
export const MARKDOWN_SHORTCODE_DEFINITIONS = [
  ICON_SHORTCODE,
  VSTACK_SHORTCODE,
  HSTACK_SHORTCODE,
  SPACER_SHORTCODE,
  IMAGE_SHORTCODE,
  PDF_SHORTCODE,
  HLS_SHORTCODE,
  YOUTUBE_SHORTCODE,
  REJECTED_SHOPS_TABLE_SHORTCODE,
  SPONSORS_SHORTCODE,
  SUPPORT_LADDER_SHORTCODE,
] as const satisfies readonly MarkdownShortcodeDefinition[];

export type MarkdownShortcodeDefinitionToken =
  (typeof MARKDOWN_SHORTCODE_DEFINITIONS)[number]["token"];

export function getMarkdownShortcodeDefinition(
  token: string,
): MarkdownShortcodeDefinition | undefined {
  return MARKDOWN_SHORTCODE_DEFINITIONS.find((definition) => definition.token === token);
}
