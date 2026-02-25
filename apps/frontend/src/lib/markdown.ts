import { Marked } from "marked";

/**
 * Renders Markdown to HTML with raw HTML blocks stripped.
 * Prevents XSS from user-submitted or admin-approved content.
 * Standard Markdown elements (bold, italic, links, code) are unaffected.
 */
const markedSafe = new Marked({
  renderer: {
    html() {
      return "";
    },
  },
});

export async function renderMarkdown(content: string): Promise<string> {
  return markedSafe.parse(content) as Promise<string>;
}
