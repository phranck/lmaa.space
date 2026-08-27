/**
 * How deeply a position sits inside the containers above it.
 *
 * A container is written `[[vstack { … }]]`, so its braces carry the structure
 * of the document and an editor can offer the right indentation for the next
 * line. This module answers that one question and knows nothing about editors.
 *
 * It reads lines rather than parsing, because it has to answer whilst the text
 * is half-written: the line that opened a container is there, the line that
 * closes it is not yet, and no parser makes sense of that. Counting is what
 * works on a document somebody is still typing.
 *
 * It answers for two moments only, and leaves every other one alone. Those two
 * are the ones an editor cannot work out on its own: the line after a container
 * opens, which has to step in, and the line that closes one, which has to step
 * back out. Everywhere else it returns `null`, so Markdown's own rules keep
 * deciding, and a list inside a container indents the way a list does.
 */

/** Two spaces per level, matching the editor's own indent unit. */
export const SHORTCODE_INDENT_UNIT = "  ";

const OPEN_BRACE = "{";
const CLOSE_BRACE = "}";

/**
 * Counts the braces in one line that belong to a shortcode.
 *
 * Both halves of the syntax have to be present, so a brace in prose or inside a
 * code fence counts for nothing: a line only opens when it also carries `[[`,
 * and only closes when it also carries `]]`. That leaves `[[hstack { a }]]` at
 * zero, which is right, because it opens and closes on the same line.
 *
 * A brace written `\{` or `\}` is text and is skipped, exactly as the tokenizer
 * skips it.
 *
 * @param line - One line of the document.
 * @returns How many levels the line opens, negative when it closes them.
 */
export function shortcodeBraceDelta(line: string): number {
  let opens = 0;
  let closes = 0;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\\") {
      const next = line[index + 1];
      if (next === OPEN_BRACE || next === CLOSE_BRACE) {
        index += 1;
        continue;
      }
    }

    if (character === OPEN_BRACE) opens += 1;
    else if (character === CLOSE_BRACE) closes += 1;
  }

  const net = opens - closes;
  if (net > 0) return line.includes("[[") ? net : 0;
  if (net < 0) return line.includes("]]") ? net : 0;
  return 0;
}

/**
 * How many containers are open at the end of line `index`.
 *
 * @param lines - The document, split into lines.
 * @param index - The last line to count, counted from zero.
 * @returns The number of levels, never below zero.
 */
export function shortcodeIndentDepth(lines: readonly string[], index: number): number {
  let depth = 0;
  for (let line = 0; line <= index; line += 1) {
    depth += shortcodeBraceDelta(lines[line] ?? "");
  }
  return Math.max(depth, 0);
}

/**
 * Which level line `index` itself stands on.
 *
 * Different from the depth at the end of that line: a line that closes a
 * container stands on the level it closes, beside the line that opened it,
 * rather than on the level of the content between them.
 *
 * @param lines - The document, split into lines.
 * @param index - Which line to place, counted from zero.
 * @returns The number of levels, never below zero.
 */
export function shortcodeLineDepth(lines: readonly string[], index: number): number {
  let depth = 0;
  for (let line = 0; line < index; line += 1) {
    depth += shortcodeBraceDelta(lines[line] ?? "");
  }

  const own = shortcodeBraceDelta(lines[index] ?? "");
  if (own < 0) depth += own;

  return Math.max(depth, 0);
}

/**
 * The indentation an editor should offer at `position`.
 *
 * @param text - The whole document.
 * @param position - An offset into it, which is where the editor is asking.
 * @param unit - One level of indentation.
 * @returns The leading whitespace, or `null` where the editor's own rules
 *   should decide instead, which is everywhere no container begins or ends.
 */
export function shortcodeIndentFor(
  text: string,
  position: number,
  unit: string = SHORTCODE_INDENT_UNIT,
): string | null {
  const lines = text.split("\n");

  let index = 0;
  let lineStart = 0;
  while (index < lines.length - 1 && lineStart + lines[index].length < position) {
    lineStart += lines[index].length + 1;
    index += 1;
  }

  const line = lines[index] ?? "";
  const delta = shortcodeBraceDelta(line);
  if (delta === 0) return null;

  // Nothing but whitespace before the position means the editor is asking what
  // this line should start with. Anything else means it is asking what comes
  // after it, which in practice is Return at the end of the line.
  const startsTheLine = text.slice(lineStart, position).trim() === "";
  if (startsTheLine ? delta > 0 : delta < 0) return null;

  return unit.repeat(shortcodeIndentDepth(lines, index));
}

/** A replacement an editor should make instead of the paste it was given. */
export interface ShortcodePasteRewrite {
  /** Where the replacement starts, which may be before the caret. */
  from: number;
  /** Where it ends. */
  to: number;
  /** What goes there. */
  insert: string;
}

/**
 * Works out how a pasted block should arrive.
 *
 * An editor pastes text at a position; this decides whether that text needs
 * re-indenting for where it lands, and what it should look like if so. Keeping
 * the decision here rather than in the editor means it can be tested, and the
 * editor is left with wiring.
 *
 * Nothing happens where nothing is gained: a paste that lands outside every
 * container and carries none of its own is left exactly as it is, and so is a
 * single line dropped into the middle of a sentence.
 *
 * @param before - The document as it stands, before the paste.
 * @param from - Where the paste starts.
 * @param to - Where it ends, which differs from `from` when it replaces a
 *   selection.
 * @param block - The text being pasted.
 * @param unit - One level of indentation.
 * @returns What to insert instead, or `null` to let the paste through
 *   untouched.
 */
export function shortcodePasteRewrite(
  before: string,
  from: number,
  to: number,
  block: string,
  unit: string = SHORTCODE_INDENT_UNIT,
): ShortcodePasteRewrite | null {
  const linesBefore = before.slice(0, from).split("\n");
  const lineStart = from - linesBefore[linesBefore.length - 1].length;
  // Where the caret sits on nothing but indentation, that indentation is part
  // of what the block replaces. Left in place it would be added to the level
  // the block computes for itself, and every line would land one step too far
  // in.
  const onOwnLine = before.slice(lineStart, from).trim() === "";

  // A single line dropped into the middle of a sentence is a phrase, not a
  // block, and a phrase carries no indentation of its own.
  if (!onOwnLine && !block.includes("\n")) return null;

  const baseDepth = shortcodeLineDepth(linesBefore, linesBefore.length - 1);
  const reindented = reindentShortcodeBlock(block, baseDepth, unit);
  const insert = onOwnLine ? reindented : reindented.trimStart();

  const start = onOwnLine ? lineStart : from;
  if (insert === before.slice(start, from) + block) return null;

  return { from: start, to, insert };
}

/**
 * Re-indents a block of text for the level it is being pasted onto.
 *
 * Each line is placed at the level its own braces put it on, counted from where
 * the block lands. Whatever indentation a line carries beyond that level is
 * kept, so a list pasted inside a container arrives as a list rather than as
 * four flat items.
 *
 * A block that opens no container and lands outside one comes back untouched.
 * That is what keeps prose, code fences and lists safe from a rule that has
 * nothing to say about them.
 *
 * @param block - The text being pasted.
 * @param baseDepth - How many containers are open where it lands.
 * @param unit - One level of indentation.
 * @returns The block, re-indented.
 */
export function reindentShortcodeBlock(
  block: string,
  baseDepth: number,
  unit: string = SHORTCODE_INDENT_UNIT,
): string {
  const lines = block.split("\n");
  const hasContainer = lines.some((line) => shortcodeBraceDelta(line) !== 0);
  if (!hasContainer && baseDepth === 0) return block;

  return lines
    .map((line, index) => {
      // An empty line stays empty rather than collecting trailing spaces.
      if (line.trim() === "") return "";

      const own = line.length - line.trimStart().length;
      const level = shortcodeLineDepth(lines, index);
      // What the line already spends on its own structure is replaced; what it
      // spends beyond that is its own business and survives.
      const beyond = Math.max(own - unit.length * level, 0);

      return unit.repeat(baseDepth + level) + " ".repeat(beyond) + line.trimStart();
    })
    .join("\n");
}
