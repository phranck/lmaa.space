/**
 * Turns shortcode source into a tree of nodes.
 *
 * A shortcode is `[[token attributes]]`, optionally with a target after a
 * colon, and optionally containing further shortcodes. This module knows the
 * shape and nothing else: it consults no definition, validates no attribute,
 * and produces no issue beyond what it cannot read at all. Meaning is applied
 * afterwards, which keeps the scanning small enough to reason about.
 *
 * Every node records where each of its parts stands, as {@link ShortcodeSpan}.
 * Reading that back out of the source afterwards would be a second grammar,
 * and the two would disagree about where a value ends the first time either
 * one changed.
 *
 * Two properties of the scan decide what an author may write.
 *
 * It tracks quotes. An attribute value in single or double quotes runs to its
 * closing quote and everything inside it is text, including newlines, `[[` and
 * `]]`. A description may therefore write a pair of brackets without it
 * becoming a node.
 *
 * It closes only on `]]` outside a quoted value, so a single `]` in prose is
 * ordinary text.
 *
 * A node may also carry a body in braces, written after its attributes, which
 * is where the content of a container goes. The body is kept as text and is
 * not scanned further: whoever renders it decides what it means, and a
 * container renders it as Markdown so anything at all may stand inside one.
 *
 * What the body loses is the indentation it carries only because of how deeply
 * it is nested. Markdown reads four leading spaces as a code block, so without
 * that the structure of the document would decide how its content is
 * understood.
 */

/** A quoted or bare attribute value, or `true` when the attribute is a flag. */
export type ShortcodeAttributeValue = string | true;

/**
 * What one stretch of a node's source is.
 *
 * @remarks
 * Recorded whilst scanning rather than worked out again afterwards, because a
 * second reading would be a second grammar. An editor that highlights from
 * these spans and a page that renders from the nodes then cannot disagree about
 * where a value ends.
 */
export type ShortcodeSpanKind =
  /** The `[[` and `]]` that open and close a node. */
  | "bracket"
  /** The `:` before a target and the `=` before a value. */
  | "separator"
  /** The token directly after `[[`. */
  | "token"
  /** What follows the colon, where a shortcode takes one. */
  | "target"
  /** An attribute's name, whether or not a value follows it. */
  | "attribute-name"
  /** A value in single or double quotes, including the quotes. */
  | "value-string"
  /** A value written without quotes, which is a number or a bare word. */
  | "value-bare"
  /** The braces around a body. What stands between them is not a span. */
  | "body-brace";

/** One stretch of source, as offsets into the whole content. */
export interface ShortcodeSpan {
  kind: ShortcodeSpanKind;
  from: number;
  to: number;
}

/** One attribute exactly as written, kept so repeats survive in order. */
export interface ShortcodeAttribute {
  name: string;
  value: ShortcodeAttributeValue;
  quoted: "single" | "double" | "bare" | "flag";
}

/** Something the scanner could not read. */
export interface ShortcodeSyntaxIssue {
  code:
    | "unterminated-node"
    | "unterminated-value"
    | "unterminated-body"
    | "invalid-attribute"
    | "node-too-long";
  message: string;
  /** Offset into the original content, so an editor can point at it. */
  offset: number;
}

/** One node of the tree. */
export interface ShortcodeNode {
  token: string;
  target?: string;
  attributes: Record<string, ShortcodeAttributeValue>;
  rawAttributes: ShortcodeAttribute[];
  children: ShortcodeNode[];
  /**
   * What stood between the braces, with escaped braces already resolved.
   *
   * Absent where the node was written without a body, which is every node the
   * site had before containers existed. The text is unscanned, so a shortcode
   * inside it is still source rather than a node.
   */
  body?: string;
  /**
   * Where the body stands in the original content, between its braces.
   *
   * @remarks
   * Given alongside {@link ShortcodeNode.body} because that text is dedented
   * and its offsets no longer match. Anything wanting to scan the body in
   * place, such as an editor colouring the shortcodes inside a container,
   * reads it from here.
   */
  bodySource?: { from: number; to: number };
  issues: ShortcodeSyntaxIssue[];
  source: { start: number; end: number; raw: string };
  /**
   * Where each part of this node stands, in the order it was read.
   *
   * @remarks
   * This node's own parts only. A child's spans hang off the child, and the
   * text between a body's braces is deliberately absent: it is Markdown, and
   * whoever displays it reads it as such.
   */
  spans: ShortcodeSpan[];
}

/**
 * Longest span a node may cover, in characters, including its children.
 *
 * A node may run over many lines, so an unclosed `[[` would otherwise search
 * the rest of the document for a `]]` and swallow whatever lies between. The
 * cap bounds that to a couple of paragraphs rather than a whole page, and it is
 * set well above what a real shortcode needs because exceeding it fails
 * quietly: the node stops matching and its source appears on the page.
 */
export const MAX_NODE_LENGTH = 8000;

/**
 * Longest body a node may carry, in characters.
 *
 * Separate from `MAX_NODE_LENGTH`, which bounds a run of attributes and is
 * sized for one. A container holds page content, so a paragraph or two is the
 * small case rather than the large one, and the cap is here only to stop an
 * unclosed brace from swallowing the rest of the document.
 */
export const MAX_BODY_LENGTH = 20000;

const TOKEN_PATTERN = /^[a-z][a-z0-9-]*/;
const ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*/;

const OPEN = "[[";
const CLOSE = "]]";
const BODY_OPEN = "{";
const BODY_CLOSE = "}";

/** True when `content` has the two-character marker at `index`. */
function isAt(content: string, index: number, marker: string): boolean {
  return content.startsWith(marker, index);
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/.test(character);
}

/**
 * Reads one attribute starting at `cursor`.
 *
 * @returns The attribute and the offset just past it, or `null` when the text
 *   at `cursor` cannot begin an attribute.
 */
function readAttribute(
  content: string,
  cursor: number,
  issues: ShortcodeSyntaxIssue[],
  spans: ShortcodeSpan[],
): { attribute: ShortcodeAttribute; next: number } | null {
  const nameMatch = content.slice(cursor).match(ATTRIBUTE_NAME_PATTERN);
  if (!nameMatch) return null;

  const name = nameMatch[0];
  let index = cursor + name.length;
  spans.push({ kind: "attribute-name", from: cursor, to: index });

  // A bare name is a flag, as in `recommended`.
  if (content[index] !== "=") {
    return { attribute: { name, value: true, quoted: "flag" }, next: index };
  }

  spans.push({ kind: "separator", from: index, to: index + 1 });
  index += 1;
  const quote = content[index];

  if (quote === '"' || quote === "'") {
    const quoteStart = index;
    index += 1;
    const valueStart = index;
    while (index < content.length && content[index] !== quote) index += 1;

    if (index >= content.length) {
      issues.push({
        code: "unterminated-value",
        message: `Attribute "${name}" has an unterminated quoted value.`,
        offset: cursor,
      });
      // Spanned to the end anyway, so an editor colours what the author is
      // still typing rather than leaving it in the surrounding text's colour.
      spans.push({ kind: "value-string", from: quoteStart, to: content.length });
      return {
        attribute: {
          name,
          value: content.slice(valueStart),
          quoted: quote === '"' ? "double" : "single",
        },
        next: content.length,
      };
    }

    const value = content.slice(valueStart, index);
    // The quotes belong to the value: they mark where it starts and ends, and
    // colouring them apart from what they enclose says nothing extra.
    spans.push({ kind: "value-string", from: quoteStart, to: index + 1 });
    return {
      attribute: { name, value, quoted: quote === '"' ? "double" : "single" },
      next: index + 1,
    };
  }

  // A bare value runs to the next whitespace, and stops at a closing pair so
  // `[[option amount=5]]` does not read the brackets as part of the number.
  const valueStart = index;
  while (index < content.length && !isWhitespace(content[index]) && !isAt(content, index, CLOSE)) {
    index += 1;
  }

  spans.push({ kind: "value-bare", from: valueStart, to: index });
  return {
    attribute: { name, value: content.slice(valueStart, index), quoted: "bare" },
    next: index,
  };
}

/**
 * Removes the indentation a body carries only because of where it is written.
 *
 * A nested container indents its content, and at two levels that is four
 * spaces, which Markdown reads as a code block. So the structure would decide
 * how the content is understood, and a heading inside two containers would come
 * out as source text.
 *
 * The smallest indentation any line carries is what belongs to the nesting, so
 * that much comes off every line. Whatever a line indents beyond it is its own,
 * and a genuine code block written deeper than its neighbours survives.
 *
 * The first line is measured separately, because a body that starts on the same
 * line as its brace has no indentation there to speak of.
 */
function dedentBody(body: string): string {
  const lines = body.split("\n");
  if (lines.length === 1) return body.trimStart();

  let common = Number.POSITIVE_INFINITY;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") continue;
    common = Math.min(common, line.length - line.trimStart().length);
  }

  if (!Number.isFinite(common) || common === 0) {
    return [lines[0].trimStart(), ...lines.slice(1)].join("\n");
  }

  return [
    lines[0].trimStart(),
    ...lines.slice(1).map((line) => (line.trim() === "" ? "" : line.slice(common))),
  ].join("\n");
}

/**
 * Reads a braced body whose opening `{` sits at `start`.
 *
 * Braces are counted, so a container holding another container closes on its
 * own brace rather than on the inner one. Nothing else is interpreted: quotes
 * are ordinary characters here, because a body is prose and an apostrophe in it
 * is an apostrophe.
 *
 * A brace that is part of the text is written `\{` or `\}`. The backslash is
 * removed as the body is read, so what comes back is what the author meant to
 * write.
 *
 * @returns The body and the offset just past its closing `}`, or `null` when
 *   the body never closes or outgrows `MAX_BODY_LENGTH`.
 */
function readBody(
  content: string,
  start: number,
  issues: ShortcodeSyntaxIssue[],
): { body: string; next: number } | null {
  const bodyStart = start + BODY_OPEN.length;
  let cursor = bodyStart;
  let depth = 1;
  const parts: string[] = [];
  let plainFrom = bodyStart;

  while (cursor < content.length) {
    if (cursor - bodyStart > MAX_BODY_LENGTH) return null;

    const character = content[cursor];

    if (character === "\\") {
      const escaped = content[cursor + 1];
      if (escaped === BODY_OPEN || escaped === BODY_CLOSE) {
        parts.push(content.slice(plainFrom, cursor), escaped);
        cursor += 2;
        plainFrom = cursor;
        continue;
      }
    }

    if (character === BODY_OPEN) {
      depth += 1;
    } else if (character === BODY_CLOSE) {
      depth -= 1;
      if (depth === 0) {
        parts.push(content.slice(plainFrom, cursor));
        return { body: dedentBody(parts.join("")), next: cursor + BODY_CLOSE.length };
      }
    }

    cursor += 1;
  }

  issues.push({
    code: "unterminated-body",
    message: "A body opened with { was never closed.",
    offset: start,
  });
  return null;
}

/**
 * Reads one node whose opening `[[` sits at `start`.
 *
 * @returns The node and the offset just past its closing `]]`, or `null` when
 *   no node begins there or the node never closes.
 */
function readNode(content: string, start: number): { node: ShortcodeNode; next: number } | null {
  const issues: ShortcodeSyntaxIssue[] = [];
  const spans: ShortcodeSpan[] = [];
  let cursor = start + OPEN.length;

  const tokenMatch = content.slice(cursor).match(TOKEN_PATTERN);
  if (!tokenMatch) return null;

  spans.push({ kind: "bracket", from: start, to: cursor });

  const token = tokenMatch[0];
  spans.push({ kind: "token", from: cursor, to: cursor + token.length });
  cursor += token.length;

  let target: string | undefined;
  if (content[cursor] === ":") {
    spans.push({ kind: "separator", from: cursor, to: cursor + 1 });
    cursor += 1;
    const targetStart = cursor;
    while (
      cursor < content.length &&
      !isWhitespace(content[cursor]) &&
      !isAt(content, cursor, CLOSE)
    ) {
      cursor += 1;
    }
    target = content.slice(targetStart, cursor) || undefined;
    if (target) spans.push({ kind: "target", from: targetStart, to: cursor });
  }

  const attributes: Record<string, ShortcodeAttributeValue> = {};
  const rawAttributes: ShortcodeAttribute[] = [];
  const children: ShortcodeNode[] = [];

  while (cursor < content.length) {
    if (cursor - start > MAX_NODE_LENGTH) {
      return null;
    }

    if (isWhitespace(content[cursor])) {
      cursor += 1;
      continue;
    }

    if (isAt(content, cursor, CLOSE)) {
      spans.push({ kind: "bracket", from: cursor, to: cursor + CLOSE.length });
      cursor += CLOSE.length;
      return {
        node: {
          token,
          target,
          attributes,
          rawAttributes,
          children,
          issues,
          source: { start, end: cursor, raw: content.slice(start, cursor) },
          spans,
        },
        next: cursor,
      };
    }

    // A body ends the node: it is the last thing written, and only the closing
    // pair may follow it. Anything after the brace would be an attribute
    // standing behind the content it describes, which reads as a mistake and
    // is treated as one.
    if (isAt(content, cursor, BODY_OPEN)) {
      const braceStart = cursor;
      const read = readBody(content, cursor, issues);
      if (!read) return null;

      const bodyEnd = read.next;
      cursor = bodyEnd;
      spans.push({ kind: "body-brace", from: braceStart, to: braceStart + BODY_OPEN.length });
      spans.push({ kind: "body-brace", from: bodyEnd - BODY_CLOSE.length, to: bodyEnd });

      while (cursor < content.length && isWhitespace(content[cursor])) cursor += 1;
      if (!isAt(content, cursor, CLOSE)) return null;
      spans.push({ kind: "bracket", from: cursor, to: cursor + CLOSE.length });
      cursor += CLOSE.length;

      return {
        node: {
          token,
          target,
          attributes,
          rawAttributes,
          children,
          body: read.body,
          bodySource: { from: braceStart + BODY_OPEN.length, to: bodyEnd - BODY_CLOSE.length },
          issues,
          source: { start, end: cursor, raw: content.slice(start, cursor) },
          spans,
        },
        next: cursor,
      };
    }

    if (isAt(content, cursor, OPEN)) {
      const child = readNode(content, cursor);
      if (!child) {
        // Not a node after all, so step over the marker rather than looping.
        cursor += OPEN.length;
        continue;
      }
      children.push(child.node);
      cursor = child.next;
      continue;
    }

    const read = readAttribute(content, cursor, issues, spans);
    if (!read) {
      issues.push({
        code: "invalid-attribute",
        message: "Attribute names must start with a letter.",
        offset: cursor,
      });
      cursor += 1;
      continue;
    }

    attributes[read.attribute.name] = read.attribute.value;
    rawAttributes.push(read.attribute);
    cursor = read.next;
  }

  return null;
}

/**
 * Scans `content` and returns every top-level node, in the order they appear.
 *
 * Nodes nested inside another node are not returned here. They hang off their
 * parent's `children`.
 *
 * A `[[` preceded by a backslash is skipped, which is how a document writes a
 * literal one.
 *
 * @param content - The Markdown source.
 * @returns The top-level nodes. Text between them is not represented, because
 *   a caller reconstructs it from `source.start` and `source.end`.
 */
export function tokenizeShortcodes(content: string): ShortcodeNode[] {
  const nodes: ShortcodeNode[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    if (!isAt(content, cursor, OPEN)) {
      cursor += 1;
      continue;
    }

    if (cursor > 0 && content[cursor - 1] === "\\") {
      cursor += OPEN.length;
      continue;
    }

    const read = readNode(content, cursor);
    if (!read) {
      cursor += OPEN.length;
      continue;
    }

    nodes.push(read.node);
    cursor = read.next;
  }

  return nodes;
}
