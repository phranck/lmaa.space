/**
 * Turns shortcode source into a tree of nodes.
 *
 * A shortcode is `[[token attributes]]`, optionally with a target after a
 * colon, and optionally containing further shortcodes. This module knows the
 * shape and nothing else: it consults no definition, validates no attribute,
 * and produces no issue beyond what it cannot read at all. Meaning is applied
 * afterwards, which keeps the scanning small enough to reason about.
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
 */

/** A quoted or bare attribute value, or `true` when the attribute is a flag. */
export type ShortcodeAttributeValue = string | true;

/** One attribute exactly as written, kept so repeats survive in order. */
export interface ShortcodeAttribute {
  name: string;
  value: ShortcodeAttributeValue;
  quoted: "single" | "double" | "bare" | "flag";
}

/** Something the scanner could not read. */
export interface ShortcodeSyntaxIssue {
  code: "unterminated-node" | "unterminated-value" | "invalid-attribute" | "node-too-long";
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
  issues: ShortcodeSyntaxIssue[];
  source: { start: number; end: number; raw: string };
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

const TOKEN_PATTERN = /^[a-z][a-z0-9-]*/;
const ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-]*/;

const OPEN = "[[";
const CLOSE = "]]";

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
): { attribute: ShortcodeAttribute; next: number } | null {
  const nameMatch = content.slice(cursor).match(ATTRIBUTE_NAME_PATTERN);
  if (!nameMatch) return null;

  const name = nameMatch[0];
  let index = cursor + name.length;

  // A bare name is a flag, as in `recommended`.
  if (content[index] !== "=") {
    return { attribute: { name, value: true, quoted: "flag" }, next: index };
  }

  index += 1;
  const quote = content[index];

  if (quote === '"' || quote === "'") {
    index += 1;
    const valueStart = index;
    while (index < content.length && content[index] !== quote) index += 1;

    if (index >= content.length) {
      issues.push({
        code: "unterminated-value",
        message: `Attribute "${name}" has an unterminated quoted value.`,
        offset: cursor,
      });
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

  return {
    attribute: { name, value: content.slice(valueStart, index), quoted: "bare" },
    next: index,
  };
}

/**
 * Reads one node whose opening `[[` sits at `start`.
 *
 * @returns The node and the offset just past its closing `]]`, or `null` when
 *   no node begins there or the node never closes.
 */
function readNode(content: string, start: number): { node: ShortcodeNode; next: number } | null {
  const issues: ShortcodeSyntaxIssue[] = [];
  let cursor = start + OPEN.length;

  const tokenMatch = content.slice(cursor).match(TOKEN_PATTERN);
  if (!tokenMatch) return null;

  const token = tokenMatch[0];
  cursor += token.length;

  let target: string | undefined;
  if (content[cursor] === ":") {
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

    const read = readAttribute(content, cursor, issues);
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
