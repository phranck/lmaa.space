/**
 * Works out what colour each part of a Markdown source should be.
 *
 * The spans come from {@link tokenizeShortcodes}, which is the one thing that
 * decides what a shortcode is. A highlighter with a pattern of its own would
 * drift from the scanner the first time either changed, and the editor would
 * then colour something the page does not render.
 *
 * What this adds on top of the scan is the two things the scanner has no
 * opinion about: whether a token is a shortcode this project knows, and where a
 * name in braces stands. Both are questions of meaning rather than of shape.
 */

import { MARKDOWN_SHORTCODE_DEFINITIONS } from "../markdown-shortcodes.js";
import type { MarkdownShortcodeDefinition } from "../markdown-shortcodes.js";
import { tokenizeShortcodes } from "./markdown-shortcode-tokenizer.js";
import type { ShortcodeNode, ShortcodeSpanKind } from "./markdown-shortcode-tokenizer.js";
import { SITE_VARIABLE_NAMES } from "./site-variables.js";
import { TEXT_TOKEN_NAMES } from "./text-tokens.js";

/**
 * What a stretch of source is, for the purpose of colouring it.
 *
 * @remarks
 * The scanner's kinds, plus the two this module decides: a name in braces that
 * something replaces at render time, and a token no definition knows.
 */
export type ShortcodeHighlightKind = ShortcodeSpanKind | "variable" | "unknown-token";

/** One stretch of source and what it is. */
export interface ShortcodeHighlightSpan {
  kind: ShortcodeHighlightKind;
  from: number;
  to: number;
}

/**
 * A name in braces, which is either a site variable or a shortcode's own
 * placeholder.
 *
 * @remarks
 * Both are written the same way and both are replaced before a reader sees
 * them, so they are one thing to somebody looking at the source.
 */
const BRACED_NAME = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/**
 * Names that are replaced anywhere in a text.
 *
 * @remarks
 * Site variables reach every page, and text tokens reach a form field. A
 * shortcode's own placeholders are not here, because each belongs to one
 * attribute of one shortcode and is meaningless outside it.
 */
const GLOBAL_NAMES: ReadonlySet<string> = new Set<string>([
  ...SITE_VARIABLE_NAMES,
  ...TEXT_TOKEN_NAMES,
]);

/** Definitions a node's token is resolved against at the top level of a text. */
const TOP_LEVEL: readonly MarkdownShortcodeDefinition[] = MARKDOWN_SHORTCODE_DEFINITIONS;

/**
 * Marks every braced name in a stretch of text.
 *
 * @param content - The whole source.
 * @param from - Where to start looking.
 * @param to - Where to stop.
 * @param known - Which names count, or `null` where every one does. An
 * attribute value passes `null`, because a shortcode's placeholders belong to
 * that one attribute and are not listed anywhere this module can reach.
 * @param out - Collected spans.
 */
function markBracedNames(
  content: string,
  from: number,
  to: number,
  known: ReadonlySet<string> | null,
  out: ShortcodeHighlightSpan[],
): void {
  for (const match of content.slice(from, to).matchAll(BRACED_NAME)) {
    if (known && !known.has(match[1])) continue;
    if (match.index === undefined) continue;
    out.push({
      kind: "variable",
      from: from + match.index,
      to: from + match.index + match[0].length,
    });
  }
}

/**
 * Splits a quoted value around the placeholders inside it.
 *
 * @param content - The whole source.
 * @param from - Start of the value, at its opening quote.
 * @param to - End of the value, past its closing quote.
 * @param out - Collected spans.
 *
 * @remarks
 * Split rather than laid over, so no two spans overlap and the colour of a
 * character is decided in one place.
 */
function markValueString(
  content: string,
  from: number,
  to: number,
  out: ShortcodeHighlightSpan[],
): void {
  const names: ShortcodeHighlightSpan[] = [];
  markBracedNames(content, from, to, null, names);

  let cursor = from;
  for (const name of names) {
    if (name.from > cursor) out.push({ kind: "value-string", from: cursor, to: name.from });
    out.push(name);
    cursor = name.to;
  }
  if (cursor < to) out.push({ kind: "value-string", from: cursor, to });
}

/**
 * Collects the spans of one node and everything inside it.
 *
 * @param content - The whole source, so offsets stay absolute.
 * @param offset - Where the scan that produced this node began.
 * @param node - The node to mark.
 * @param allowed - Definitions this node's token is resolved against, which is
 * the parent's child list rather than the document's. `option` means something
 * inside `interval` and nothing at the top level.
 * @param out - Collected spans.
 */
function markNode(
  content: string,
  offset: number,
  node: ShortcodeNode,
  allowed: readonly MarkdownShortcodeDefinition[],
  out: ShortcodeHighlightSpan[],
): void {
  const definition = allowed.find((candidate) => candidate.token === node.token);

  for (const span of node.spans) {
    const from = offset + span.from;
    const to = offset + span.to;

    if (span.kind === "token" && !definition) {
      out.push({ kind: "unknown-token", from, to });
      continue;
    }

    if (span.kind === "value-string") {
      markValueString(content, from, to, out);
      continue;
    }

    out.push({ kind: span.kind, from, to });
  }

  for (const child of node.children) {
    markNode(content, offset, child, definition?.children ?? [], out);
  }

  // A body is Markdown, so what stands in it is read the way the page reads it:
  // a shortcode there is a shortcode of its own rather than a child of this one.
  if (node.bodySource) {
    collect(content, offset + node.bodySource.from, offset + node.bodySource.to, out);
  }
}

/**
 * Walks a stretch of source, marking its nodes and the text between them.
 *
 * @param content - The whole source.
 * @param from - Where this stretch begins.
 * @param to - Where it ends.
 * @param out - Collected spans.
 */
function collect(content: string, from: number, to: number, out: ShortcodeHighlightSpan[]): void {
  const nodes = tokenizeShortcodes(content.slice(from, to));
  let cursor = from;

  for (const node of nodes) {
    const start = from + node.source.start;
    if (start > cursor) markBracedNames(content, cursor, start, GLOBAL_NAMES, out);
    markNode(content, from, node, TOP_LEVEL, out);
    cursor = from + node.source.end;
  }

  if (cursor < to) markBracedNames(content, cursor, to, GLOBAL_NAMES, out);
}

/**
 * Works out how every part of a Markdown source should be coloured.
 *
 * @param content - The Markdown source.
 * @returns Every span, ordered by where it starts and never overlapping, which
 * is what an editor's decoration set requires.
 *
 * @remarks
 * Text that is neither a shortcode nor a replaced name produces no span at all.
 * It keeps whatever colour the Markdown highlighting gives it, which is the
 * point: this adds to that highlighting rather than replacing it.
 */
export function highlightShortcodes(content: string): ShortcodeHighlightSpan[] {
  const spans: ShortcodeHighlightSpan[] = [];
  collect(content, 0, content.length, spans);
  return spans.sort((left, right) => left.from - right.from || left.to - right.to);
}
