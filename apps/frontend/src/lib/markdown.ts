import { Marked } from "marked";

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
});

export async function renderMarkdown(content: string): Promise<string> {
  return markedSafe.parse(content) as Promise<string>;
}
