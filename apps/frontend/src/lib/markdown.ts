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
      return `<a href="${href}"${titleAttr} rel="noopener noreferrer" target="_blank">${text}</a>`;
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
    heading({ text }) {
      return `${text} `;
    },
    paragraph({ text }) {
      return `${text} `;
    },
    link({ text }) {
      return text;
    },
    image() {
      return "";
    },
    strong({ text }) {
      return text;
    },
    em({ text }) {
      return text;
    },
    codespan({ text }) {
      return text;
    },
    code({ text }) {
      return `${text} `;
    },
    blockquote({ text }) {
      return text;
    },
    list({ items }) {
      return items.map((i) => i.text).join(" ");
    },
    listitem({ text }) {
      return text;
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
