import { Marked } from "marked";
import markedFootnote from "marked-footnote";

/**
 * Renders Markdown to HTML with raw HTML blocks stripped.
 * Prevents XSS from user-submitted or admin-approved content.
 * Standard Markdown elements (bold, italic, links, code) are unaffected.
 */
const UNSAFE_HREF = /^\s*javascript:/i;

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
  return markedSafe.parse(content) as Promise<string>;
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
