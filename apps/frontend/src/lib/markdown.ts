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

type MarkdownShortcodeKind = "widget" | "image" | "pdf" | "hls" | "youtube";

type MarkdownMediaAlias =
  | string
  | {
      url: string;
      posterUrl?: string | null;
    };

export type MarkdownMediaAliases = Record<string, MarkdownMediaAlias>;

function parseShortcodeAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;

  for (const match of input.matchAll(attrRegex)) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    attrs[key] = doubleQuoted ?? singleQuoted ?? bare ?? "";
  }

  return attrs;
}

function parsePositiveInt(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getSafeAspectRatio(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const [width, height, ...rest] = value.split("/");
  if (rest.length > 0 || !width || !height) return null;

  const parsedWidth = parsePositiveInt(width);
  const parsedHeight = parsePositiveInt(height);
  if (!parsedWidth || !parsedHeight) return null;

  return `${parsedWidth} / ${parsedHeight}`;
}

function isHlsManifestPath(pathOrUrl: string): boolean {
  try {
    const parsed = new URL(pathOrUrl, "https://lmaa.space");
    return parsed.pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return pathOrUrl.split(/[?#]/)[0]?.toLowerCase().endsWith(".m3u8") ?? false;
  }
}

function getYoutubeVideoId(raw: string): string | null {
  const value = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const hostname = parsed.hostname.toLowerCase();
  const pathSegments = parsed.pathname.split("/").filter(Boolean);
  const candidate =
    hostname === "youtu.be"
      ? pathSegments[0]
      : hostname === "youtube-nocookie.com" || hostname.endsWith(".youtube-nocookie.com")
        ? pathSegments[0] === "embed"
          ? pathSegments[1]
          : null
        : hostname === "youtube.com" || hostname.endsWith(".youtube.com")
          ? parsed.pathname === "/watch"
            ? parsed.searchParams.get("v")
            : pathSegments[0] === "embed" || pathSegments[0] === "shorts"
              ? pathSegments[1]
              : null
          : null;

  return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

function getMediaAliasUrl(alias: MarkdownMediaAlias | undefined): string | null {
  if (!alias) return null;
  return typeof alias === "string" ? alias : alias.url;
}

function getMediaAliasPosterUrl(alias: MarkdownMediaAlias | undefined): string | null {
  if (!alias || typeof alias === "string") return null;
  return alias.posterUrl ?? null;
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

function renderHlsShortcode(
  target: string,
  attrs: Record<string, string>,
  aliases?: MarkdownMediaAliases,
  fallbackPoster?: string | null,
): string {
  const src = getSafeSiteAssetPath(target);
  if (!src || !isHlsManifestPath(src)) {
    return escapeHtml(`[[hls:${target}]]`);
  }

  const title = attrs.title?.trim();
  const caption = attrs.caption?.trim();
  const aspectRatio = getSafeAspectRatio(attrs.aspect);
  const posterTarget = attrs.poster
    ? (getMediaAliasUrl(aliases?.[attrs.poster]) ?? attrs.poster)
    : fallbackPoster;
  const poster = posterTarget ? getSafeSiteAssetPath(posterTarget) : null;
  const titleAttr = title
    ? ` title="${escapeHtmlAttribute(title)}" aria-label="${escapeHtmlAttribute(title)}"`
    : "";
  const posterAttr = poster ? ` poster="${escapeHtmlAttribute(poster)}"` : "";
  const styleAttr = aspectRatio
    ? ` style="--md-video-aspect-ratio:${escapeHtmlAttribute(aspectRatio)};"`
    : "";
  const maximizeButton = `<button class="md-video-maximize" type="button" aria-label="Video vergrößern" data-hls-maximize><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" /></svg></button>`;
  const video = `<video class="js-hls-player" data-hls-src="${escapeHtmlAttribute(src)}" controls playsinline preload="metadata"${titleAttr}${posterAttr}><a href="${escapeHtmlAttribute(src)}" target="_blank" rel="noopener noreferrer">Video öffnen</a></video>`;
  const frame = `<div class="md-video-frame">${video}${maximizeButton}</div>`;

  if (!caption) {
    return `<figure class="md-video"${styleAttr}>${frame}</figure>`;
  }

  return `<figure class="md-video"${styleAttr}>${frame}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function renderYoutubeShortcode(
  target: string,
  attrs: Record<string, string>,
  aliases?: MarkdownMediaAliases,
): string {
  const srcTarget = getMediaAliasUrl(aliases?.[target]) ?? target;
  const videoId = getYoutubeVideoId(srcTarget);
  if (!videoId) {
    return escapeHtml(`[[youtube:${target}]]`);
  }

  const title = attrs.title?.trim() || "YouTube video";
  const caption = attrs.caption?.trim();
  const aspectRatio = getSafeAspectRatio(attrs.aspect);
  const styleAttr = aspectRatio
    ? ` style="--md-video-aspect-ratio:${escapeHtmlAttribute(aspectRatio)};"`
    : "";
  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  const iframe = `<iframe class="md-youtube-player" src="${embedSrc}" title="${escapeHtmlAttribute(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  const frame = `<div class="md-youtube-frame">${iframe}</div>`;

  if (!caption) {
    return `<figure class="md-video md-youtube"${styleAttr}>${frame}</figure>`;
  }

  return `<figure class="md-video md-youtube"${styleAttr}>${frame}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

function extractShortcodes(
  content: string,
  aliases?: MarkdownMediaAliases,
): { content: string; tokens: MarkdownShortcodeToken[] } {
  const tokens: MarkdownShortcodeToken[] = [];
  let index = 0;

  const nextContent = content.replace(
    /\[\[(widget|image|pdf|hls|youtube):([^\]\s]+)([^\]]*)\]\]/g,
    (_match, kind: MarkdownShortcodeKind, rawTarget: string, attrsInput: string) => {
      const alias = kind !== "widget" ? aliases?.[rawTarget] : undefined;
      const target = getMediaAliasUrl(alias) ?? rawTarget;
      const attrs = parseShortcodeAttributes(attrsInput);
      const fallbackPoster = kind === "hls" ? getMediaAliasPosterUrl(alias) : null;
      const placeholder = `LMAA_SHORTCODE_${index}_TOKEN`;
      index += 1;

      const html =
        kind === "widget"
          ? renderWidgetShortcode(target, attrs)
          : kind === "image"
            ? renderImageShortcode(target, attrs)
            : kind === "pdf"
              ? renderPdfShortcode(target, attrs)
              : kind === "hls"
                ? renderHlsShortcode(target, attrs, aliases, fallbackPoster)
                : renderYoutubeShortcode(rawTarget, attrs, aliases);

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
 * @param aliases - Optional alias-to-URL map for media shortcodes.
 * @returns HTML string safe for insertion into trusted templates.
 */
export async function renderMarkdown(
  content: string,
  aliases: MarkdownMediaAliases = {},
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
  const withoutFootnotes = stripFootnotes(content);
  return (markedPlainText.parse(withoutFootnotes) as string).replace(/\s+/g, " ").trim();
}

function stripFootnotes(content: string): string {
  const lines = content.split(/\r?\n/);
  const normalized: string[] = [];
  let inFence = false;
  let skippingFootnoteDefinition = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      normalized.push(line);
      continue;
    }

    if (!inFence && /^\[\^[^\]]+\]:/.test(trimmed)) {
      skippingFootnoteDefinition = true;
      continue;
    }

    if (skippingFootnoteDefinition) {
      if (trimmed === "" || /^(?:\s{2,}|\t)/.test(line)) {
        continue;
      }

      skippingFootnoteDefinition = false;
    }

    normalized.push(line);
  }

  return normalized.join("\n").replace(/\[\^[^\]]+\]/g, "");
}
