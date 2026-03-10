import { Marked } from "marked";
import markedFootnote from "marked-footnote";

import { escapeHtmlAttribute, getSafeConfigHref, isExternalHref } from "./safe-url";

/**
 * Renders Markdown to HTML.
 * Raw HTML blocks are escaped to text.
 * Unsafe hrefs in links are stripped.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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
    link({ href, title, text }) {
      const safeHref = getSafeConfigHref(href);
      if (!safeHref) return escapeHtml(text);
      const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : "";
      const isExternal = isExternalHref(safeHref);
      const extAttrs = isExternal ? ' rel="noopener noreferrer" target="_blank"' : "";
      return `<a href="${escapeHtmlAttribute(safeHref)}"${titleAttr}${extAttrs}>${escapeHtml(text)}</a>`;
    },
    html({ text }) {
      return escapeHtml(text);
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
