import { Marked } from "marked";
import markedFootnote from "marked-footnote";

/**
 * Renders Markdown to HTML with raw HTML blocks stripped.
 * Prevents XSS from user-submitted or admin-approved content.
 * Standard Markdown elements (bold, italic, links, code) are unaffected.
 */
const UNSAFE_HREF = /^\s*javascript:/i;

function normalizeFootnoteSourceHeadings(content: string): string {
  const lines = content.split(/\r?\n/);
  const normalized: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      normalized.push(line);
      continue;
    }

    if (!inFence) {
      const sourceHeadingMatch = trimmed.match(/^(?:#{1,6}\s*)?(Quellen|Sources)\s*:?\s*$/i);

      if (sourceHeadingMatch) {
        let nextIndex = index + 1;
        while (nextIndex < lines.length && lines[nextIndex].trim() === "") {
          nextIndex += 1;
        }

        if (nextIndex < lines.length && /^\[\^[^\]]+\]:/.test(lines[nextIndex].trim())) {
          const label = sourceHeadingMatch[1];

          if (normalized.length > 0 && normalized[normalized.length - 1] !== "") {
            normalized.push("");
          }

          normalized.push(`### ${label}`);
          normalized.push("");
          index = nextIndex - 1;
          continue;
        }
      }
    }

    normalized.push(line);
  }

  return normalized.join("\n");
}

const markedSafe = new Marked({
  renderer: {
    html() {
      return "";
    },
    link({ href, title, text }) {
      if (!href || UNSAFE_HREF.test(href)) return text;
      const titleAttr = title ? ` title="${title}"` : "";
      const isExternal = /^https?:\/\//i.test(href) && !href.startsWith("https://lmaa.space");
      const extAttrs = isExternal ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${href}"${titleAttr}${extAttrs}>${text}</a>`;
    },
  },
}).use(markedFootnote());

/**
 * Renders Markdown into sanitized HTML.
 *
 * @param content - Markdown source text.
 * @returns HTML string safe for insertion into trusted templates.
 */
export async function renderMarkdown(content: string): Promise<string> {
  return markedSafe.parse(normalizeFootnoteSourceHeadings(content)) as Promise<string>;
}

const markedPlainText = new Marked({
  renderer: {
    heading({ tokens }) {
      return `${this.parser.parseInline(tokens)} `;
    },
    paragraph({ tokens }) {
      return `${this.parser.parseInline(tokens)} `;
    },
    link({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    image() {
      return "";
    },
    strong({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    em({ tokens }) {
      return this.parser.parseInline(tokens);
    },
    codespan({ text }) {
      return text;
    },
    code({ text }) {
      return `${text} `;
    },
    blockquote({ tokens }) {
      return this.parser.parse(tokens);
    },
    list({ items }) {
      return items.map((i) => this.parser.parse(i.tokens)).join(" ");
    },
    listitem({ tokens }) {
      return this.parser.parse(tokens);
    },
    hr() {
      return " ";
    },
    html() {
      return "";
    },
  },
});

/**
 * Strips Markdown syntax via marked, returning plain text.
 */
export function stripMarkdown(content: string): string {
  return (markedPlainText.parse(content) as string).replace(/\s+/g, " ").trim();
}
