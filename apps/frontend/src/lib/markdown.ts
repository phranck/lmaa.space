import { Marked } from "marked";
import markedFootnote from "marked-footnote";

import {
  escapeHtmlAttribute,
  getSafeConfigHref,
  getSafeSiteAssetPath,
  isExternalHref,
} from "./safe-url";

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

type MarkdownShortcodeToken = {
  placeholder: string;
  html: string;
};

function parseShortcodeAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;

  for (const match of input.matchAll(attrRegex)) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    attrs[key] = doubleQuoted ?? singleQuoted ?? bare ?? "";
  }

  return attrs;
}

function renderWidgetShortcode(target: string, attrs: Record<string, string>): string {
  const key = target.trim();
  if (!/^[a-z0-9-]+$/.test(key)) {
    return escapeHtml(`[[widget:${target}]]`);
  }

  const title = attrs.title?.trim() || `Widget ${key}`;
  const parsedHeight = Number(attrs.height ?? "");
  const height = Number.isFinite(parsedHeight)
    ? Math.min(2400, Math.max(40, Math.round(parsedHeight)))
    : 320;

  return `<div class="md-widget"><iframe src="/markdown-widgets/${encodeURIComponent(
    key,
  )}" title="${escapeHtmlAttribute(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox" style="width:100%;height:${height}px;border:0;overflow:hidden;"></iframe></div>`;
}

function renderImageShortcode(target: string, attrs: Record<string, string>): string {
  const src = getSafeSiteAssetPath(target);
  if (!src) {
    return escapeHtml(`[[image:${target}]]`);
  }

  const alt = attrs.alt?.trim() ?? "";
  const caption = attrs.caption?.trim();
  const parsedWidth = Number(attrs.width ?? "");
  const parsedHeight = Number(attrs.height ?? "");
  const width = Number.isFinite(parsedWidth)
    ? ` width="${Math.min(4096, Math.max(1, Math.round(parsedWidth)))}"`
    : "";
  const height = Number.isFinite(parsedHeight)
    ? ` height="${Math.min(4096, Math.max(1, Math.round(parsedHeight)))}"`
    : "";
  const image = `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}"${width}${height} loading="lazy" decoding="async" />`;

  if (!caption) {
    return `<div class="md-image">${image}</div>`;
  }

  return `<figure class="md-image">${image}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function renderPdfShortcode(target: string, attrs: Record<string, string>): string {
  const href = getSafeSiteAssetPath(target);
  if (!href) {
    return escapeHtml(`[[pdf:${target}]]`);
  }

  const label = attrs.label?.trim() || attrs.title?.trim() || "PDF öffnen";
  return `<p class="md-pdf"><a href="${escapeHtmlAttribute(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
}

function extractShortcodes(
  content: string,
  aliases?: Record<string, string>,
): { content: string; tokens: MarkdownShortcodeToken[] } {
  const tokens: MarkdownShortcodeToken[] = [];
  let index = 0;

  const nextContent = content.replace(
    /\[\[(widget|image|pdf):([^\]\s]+)([^\]]*)\]\]/g,
    (_match, kind: string, rawTarget: string, attrsInput: string) => {
      const target = (kind !== "widget" && aliases?.[rawTarget]) || rawTarget;
      const attrs = parseShortcodeAttributes(attrsInput);
      const placeholder = `LMAA_SHORTCODE_${index}_TOKEN`;
      index += 1;

      const html =
        kind === "widget"
          ? renderWidgetShortcode(target, attrs)
          : kind === "image"
            ? renderImageShortcode(target, attrs)
            : renderPdfShortcode(target, attrs);

      tokens.push({ placeholder, html });
      return `\n\n${placeholder}\n\n`;
    },
  );

  return { content: nextContent, tokens };
}

function injectShortcodes(html: string, tokens: MarkdownShortcodeToken[]): string {
  let nextHtml = html;

  for (const token of tokens) {
    nextHtml = nextHtml
      .replace(`<p>${token.placeholder}</p>`, token.html)
      .replace(token.placeholder, token.html);
  }

  return nextHtml;
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
 * Renders Markdown into sanitized HTML with optional media alias resolution.
 *
 * @param content - Markdown source text.
 * @param aliases - Optional alias-to-URL map for `[[image:alias]]` shortcodes.
 * @returns HTML string safe for insertion into trusted templates.
 */
export async function renderMarkdown(
  content: string,
  aliases: Record<string, string> = {},
): Promise<string> {
  const normalized = normalizeFootnoteSourceHeadings(content);
  const { content: withShortcodes, tokens } = extractShortcodes(normalized, aliases);
  const html = (await markedSafe.parse(withShortcodes)) as string;
  return injectShortcodes(html, tokens);
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
