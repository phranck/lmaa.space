import { Marked } from "marked";
import markedFootnote from "marked-footnote";

import {
  ICON_DEFAULT_SIZE,
  MARKDOWN_SHORTCODE_TOKENS,
  parseMarkdownShortcodes,
  type MarkdownShortcodeAttributeValue,
  type ParsedMarkdownShortcode,
} from "@lmaa/shared";

import { duotonePaths, loadDuotoneIcons } from "@/lib/phosphor-duotone";


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

type MarkdownMediaAlias =
  | string
  | {
      url: string;
      posterUrl?: string | null;
    };

export type MarkdownMediaAliases = Record<string, MarkdownMediaAlias>;

function stringifyShortcodeAttributes(
  source: Record<string, MarkdownShortcodeAttributeValue>,
): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value !== true) {
      attrs[key] = value;
    }
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

/**
 * The icon names a text asks for.
 *
 * Read with a pattern rather than through the parser, because this runs before
 * parsing and only needs to know what to fetch. A name that turns out not to be
 * an icon costs one lookup that finds nothing, which is why being generous here
 * is cheaper than parsing twice.
 *
 * @param content - The text as written.
 * @returns Every name found, duplicates included.
 */
function iconNamesIn(content: string): string[] {
  const names: string[] = [];
  for (const match of content.matchAll(/\[\[icon\b[^\]]*?\bname\s*=\s*"([^"]+)"/g)) {
    if (match[1]) names.push(match[1].trim());
  }
  return names;
}

/** A hex figure of three, four, six or eight digits, with or without its hash. */
const HEX_COLOUR = /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A colour named in words, which is how CSS spells `tomato` and `rebeccapurple`. */
const NAMED_COLOUR = /^[a-z]+$/i;

/** A reference to one of the design system's own colours. */
const TOKEN_COLOUR = /^var\(--[a-z0-9-]+\)$/i;

/**
 * The colour an icon is drawn in, from what the author wrote.
 *
 * A bare hex figure gets its hash, so `cea836` and `#cea836` mean the same
 * thing. Whatever is none of the three forms below becomes the colour of the
 * surrounding text, because a value that reaches `fill` unread can point at a
 * paint server elsewhere in the document instead of naming a colour.
 *
 * @param raw - The `color` parameter, where the author wrote one.
 * @returns A value that is safe to put in `fill`.
 */
function iconFill(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return "currentColor";
  if (HEX_COLOUR.test(value)) return value.startsWith("#") ? value : `#${value}`;
  if (NAMED_COLOUR.test(value) || TOKEN_COLOUR.test(value)) return value;
  return "currentColor";
}

/** Where a label sits against its icon, under the names SwiftUI gives them. */
type IconAlignment =
  | "top"
  | "bottom"
  | "leading"
  | "trailing"
  | "center"
  | "topLeading"
  | "topTrailing"
  | "bottomLeading"
  | "bottomTrailing";

/**
 * The classes that place a label against its icon.
 *
 * The first class names the axis and which end of it the icon takes, the second
 * where the label sits across that axis. `center` names no side at all and lays
 * the label over the middle of the symbol, which is what SwiftUI's `.center`
 * does in a `ZStack`.
 */
const ICON_PAIR_CLASSES: Record<IconAlignment, string> = {
  trailing: "md-icon-pair--row",
  leading: "md-icon-pair--row-reverse",
  topTrailing: "md-icon-pair--row md-icon-pair--start",
  topLeading: "md-icon-pair--row-reverse md-icon-pair--start",
  bottomTrailing: "md-icon-pair--row md-icon-pair--end",
  bottomLeading: "md-icon-pair--row-reverse md-icon-pair--end",
  bottom: "md-icon-pair--column",
  top: "md-icon-pair--column-reverse",
  center: "md-icon-pair--stacked",
};

/**
 * The classes that float an icon so the paragraph beside it runs around it.
 *
 * An alignment names where the text goes, so the icon takes the opposite side:
 * `trailing` puts the text on the right and therefore floats the icon to the
 * left. Only the horizontal alignments name a side at all, and the others are
 * absent here, because a paragraph cannot flow above or below something.
 */
const ICON_FLOAT_CLASSES: Partial<Record<IconAlignment, string>> = {
  trailing: "md-icon--float-start",
  topTrailing: "md-icon--float-start",
  bottomTrailing: "md-icon--float-start",
  leading: "md-icon--float-end",
  topLeading: "md-icon--float-end",
  bottomLeading: "md-icon--float-end",
};

/** Where the symbol itself stands in the block, as SwiftUI names the three. */
type IconPlacement = "leading" | "center" | "trailing";

/**
 * The classes that place the symbol in the block it sits in.
 *
 * This answers a different question from the alignment above, which is only
 * ever about the text. The two are set apart because reaching for the text's
 * alignment to centre a symbol that carries no text says the opposite of what
 * is meant.
 */
const ICON_PLACEMENT_CLASSES: Record<IconPlacement, string> = {
  leading: "md-icon--align-start",
  center: "md-icon--align-center",
  trailing: "md-icon--align-end",
};

/**
 * The alignment an author wrote, in whichever spelling they reached for.
 *
 * SwiftUI writes `.topLeading`, so the leading dot belongs to the name as much
 * as the capital does. `topleading` and `top-leading` are read as the same
 * thing, because a name that works in one casing only is a name to look up
 * rather than one to remember.
 *
 * @param raw - The `textalignment` parameter, where the author wrote one.
 * @returns The alignment, or `null` for anything that names none.
 */
function readAlignment(raw: string | undefined): IconAlignment | null {
  const written = raw
    ?.trim()
    .replace(/^\./, "")
    .replace(/[-_\s]/g, "")
    .toLowerCase();
  if (!written) return null;

  const names = Object.keys(ICON_PAIR_CLASSES) as IconAlignment[];
  return names.find((one) => one.toLowerCase() === written) ?? null;
}

/**
 * Where the symbol itself stands, from what the author wrote.
 *
 * Read the same forgiving way as the text's alignment, so `.center`, `center`
 * and `CENTER` all arrive as the same placement.
 *
 * @param raw - The `alignment` parameter, where the author wrote one.
 * @returns The placement, or `null` for anything that names none.
 */
function readPlacement(raw: string | undefined): IconPlacement | null {
  const written = raw
    ?.trim()
    .replace(/^\./, "")
    .replace(/[-_\s]/g, "")
    .toLowerCase();
  if (!written) return null;

  const names = Object.keys(ICON_PLACEMENT_CLASSES) as IconPlacement[];
  return names.find((one) => one.toLowerCase() === written) ?? null;
}

/**
 * Draws a Phosphor icon as inline markup, always in its duotone weight.
 *
 * The paths come from the store the renderer filled before it started, because
 * this function hands back a string and cannot wait for anything. An icon
 * nobody could find leaves the shortcode standing in the text, so the person
 * who wrote it sees that the name is wrong rather than an empty space.
 *
 * Without a colour the icon inherits the text's, which is what `currentColor`
 * means and what duotone is built around.
 *
 * @param attrs - The attributes as written.
 * @returns The markup, or the shortcode as text when the name leads nowhere.
 */
function renderIconShortcode(attrs: Record<string, string>): string {
  const name = attrs.name?.trim() ?? "";
  const paths = duotonePaths(name);
  if (!paths) return escapeHtml(`[[icon name="${name}"]]`);

  const parsedSize = Number(attrs.size ?? "");
  const size =
    Number.isFinite(parsedSize) && parsedSize > 0 ? Math.round(parsedSize) : ICON_DEFAULT_SIZE;
  const fill = escapeHtmlAttribute(iconFill(attrs.color));
  const label = attrs.text?.trim();
  // A label with no alignment sits after the icon, the way a label follows the
  // symbol on a button.
  const written = attrs.textalignment ?? attrs.textAlignment ?? attrs["text-alignment"];
  const alignment = readAlignment(written) ?? (label ? "trailing" : null);
  const placement = readPlacement(attrs.alignment);

  // Without a label, an alignment naming a side floats the icon so the next
  // paragraph runs past it. A floated element is placed by the float itself, so
  // the placement has nothing left to say in that case.
  const floated = label || !alignment ? undefined : ICON_FLOAT_CLASSES[alignment];
  const placed = floated ?? (placement ? ICON_PLACEMENT_CLASSES[placement] : undefined);

  const shapes = paths
    .map((path) => {
      const opacity = path.opacity ? ` opacity="${escapeHtmlAttribute(path.opacity)}"` : "";
      return `<path d="${escapeHtmlAttribute(path.d)}"${opacity} />`;
    })
    .join("");

  const iconClass = ["md-icon", label ? undefined : placed].filter(Boolean).join(" ");
  const svg = `<svg class="${iconClass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}" fill="${fill}" role="img" aria-hidden="true">${shapes}</svg>`;
  if (!alignment || !label) return svg;

  const { html: labelHtml, block } = renderIconLabel(label);
  const tag = block ? "div" : "span";
  const pairClass = ["md-icon-pair", ICON_PAIR_CLASSES[alignment], placed]
    .filter(Boolean)
    .join(" ");

  return `<${tag} class="${pairClass}">${svg}<${tag} class="md-icon-pair__label">${labelHtml}</${tag}></${tag}>`;
}

/** The closing tag of a paragraph, used to recognise a label that is only one. */
const PARAGRAPH_END = "</p>";

/**
 * The label of an icon, rendered as Markdown.
 *
 * A label is usually a few words, and those belong inside the line the icon
 * sits on. One carrying a heading or several paragraphs cannot go there: a
 * heading is not permitted inside a `span`, and a browser meeting one breaks
 * the surrounding paragraph open to fix it. Such a label is reported as a block
 * so the caller wraps it in a `div` instead, and a label that is a single
 * paragraph loses that paragraph and stays in the line.
 *
 * @param label - What the author wrote in `text`.
 * @returns The rendered HTML, and whether it holds more than one paragraph.
 */
function renderIconLabel(label: string): { html: string; block: boolean } {
  const rendered = (markedSafe.parse(label) as string).trim();
  const single =
    rendered.startsWith("<p>") &&
    rendered.indexOf(PARAGRAPH_END) === rendered.length - PARAGRAPH_END.length;

  if (!single) return { html: rendered, block: true };
  return { html: rendered.slice("<p>".length, -PARAGRAPH_END.length), block: false };
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

/**
 * How deep containers may be nested before the innermost is left as text.
 *
 * A stack renders its body through this same pipeline, so a document that
 * nested without end would recurse without end. Four is past what a page
 * plausibly needs and far short of what a stack overflow needs.
 */
const MAX_STACK_DEPTH = 4;

/** How a stack lays its children out across its own direction. */
const STACK_ALIGNMENT_CLASSES: Record<string, string> = {
  // A VStack aligns horizontally, under SwiftUI's HorizontalAlignment names.
  leading: "md-stack--start",
  trailing: "md-stack--end",
  // An HStack aligns vertically, under SwiftUI's VerticalAlignment names.
  top: "md-stack--start",
  bottom: "md-stack--end",
  firstTextBaseline: "md-stack--baseline",
  // Both axes spell the middle the same way.
  center: "md-stack--center",
};

/**
 * Draws a gap.
 *
 * With a size it is exactly that tall, or that wide in a horizontal stack,
 * because a flex item takes its main size from the axis it sits on. Without
 * one it grows into whatever room is left, which is what SwiftUI's `Spacer`
 * does and what pushes two things to opposite ends of a row.
 *
 * @param shortcode - The parsed spacer, whose params carry the validated size.
 */
function renderSpacerShortcode(shortcode: ParsedMarkdownShortcode): string {
  const size = shortcode.params.size;
  if (typeof size !== "number") return `<div class="md-spacer md-spacer--flexible"></div>`;

  const pixels = escapeHtmlAttribute(String(size));
  return `<div class="md-spacer" style="flex-basis: ${pixels}px; height: ${pixels}px"></div>`;
}

/**
 * Draws a container and everything inside it.
 *
 * The body is page content, so it goes through the same pipeline as the text
 * around it. That is what lets any shortcode stand inside a stack, another
 * stack included, without this function knowing about a single one of them.
 *
 * @param shortcode - The parsed stack, whose params carry the validated
 *   alignment and spacing.
 * @param depth - How many containers this one already sits inside.
 * @returns The container's HTML, or its own source as text once the nesting
 *   runs deeper than `MAX_STACK_DEPTH`.
 */
function renderStackShortcode(
  shortcode: ParsedMarkdownShortcode,
  aliases: MarkdownMediaAliases | undefined,
  depth: number,
): string {
  if (depth >= MAX_STACK_DEPTH) return escapeHtml(shortcode.source.raw);

  const axis = shortcode.token === MARKDOWN_SHORTCODE_TOKENS.vstack ? "column" : "row";
  const alignment = STACK_ALIGNMENT_CLASSES[String(shortcode.params.alignment ?? "")];
  const spacing = shortcode.params.spacing;
  // Only a stated spacing is written out. Without one the stylesheet's own gap
  // stands, so the page's rhythm is decided in one place rather than here.
  const style =
    typeof spacing === "number" ? ` style="gap: ${escapeHtmlAttribute(String(spacing))}px"` : "";

  const className = ["md-stack", `md-stack--${axis}`, alignment].filter(Boolean).join(" ");
  const body = renderMarkdownBody(shortcode.body ?? "", aliases, depth + 1);

  return `<div class="${className}"${style}>${body}</div>`;
}

function extractRenderableShortcodes(
  content: string,
  aliases?: MarkdownMediaAliases,
  depth = 0,
): { content: string; tokens: MarkdownShortcodeToken[] } {
  const tokens: MarkdownShortcodeToken[] = [];
  const contentParts: string[] = [];
  let lastIndex = 0;

  for (const shortcode of parseMarkdownShortcodes(content)) {
    const html = renderParsedShortcode(shortcode, aliases, depth);
    if (!html) continue;

    const placeholder = `LMAA_SHORTCODE_${tokens.length}_TOKEN`;
    tokens.push({ placeholder, html });
    contentParts.push(content.slice(lastIndex, shortcode.source.start));
    contentParts.push(`\n\n${placeholder}\n\n`);
    lastIndex = shortcode.source.end;
  }

  contentParts.push(content.slice(lastIndex));

  return { content: contentParts.join(""), tokens };
}

function renderParsedShortcode(
  shortcode: ParsedMarkdownShortcode,
  aliases?: MarkdownMediaAliases,
  depth = 0,
): string | null {
  if (shortcode.issues.some((issue) => issue.code === "missing-target")) return null;
  if (shortcode.definition.renderMode === "island") return null;

  // Before the target check, because these carry none: everything they need
  // stands in their attributes and, for a container, in its body.
  if (
    shortcode.token === MARKDOWN_SHORTCODE_TOKENS.vstack ||
    shortcode.token === MARKDOWN_SHORTCODE_TOKENS.hstack
  ) {
    return renderStackShortcode(shortcode, aliases, depth);
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.spacer) {
    return renderSpacerShortcode(shortcode);
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.icon) {
    return renderIconShortcode(stringifyShortcodeAttributes(shortcode.attributes));
  }

  const rawTarget = shortcode.target;
  if (!rawTarget) return null;

  const attrs = stringifyShortcodeAttributes(shortcode.attributes);
  const alias =
    shortcode.token !== MARKDOWN_SHORTCODE_TOKENS.widget ? aliases?.[rawTarget] : undefined;
  const target = getMediaAliasUrl(alias) ?? rawTarget;

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.widget) {
    return renderWidgetShortcode(target, attrs);
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.image) {
    return renderImageShortcode(target, attrs);
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.pdf) {
    return renderPdfShortcode(target, attrs);
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.hls) {
    return renderHlsShortcode(target, attrs, aliases, getMediaAliasPosterUrl(alias));
  }

  if (shortcode.token === MARKDOWN_SHORTCODE_TOKENS.youtube) {
    return renderYoutubeShortcode(rawTarget, attrs, aliases);
  }

  return null;
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

/**
 * Builds a renderer with the project's escaping rules.
 *
 * The configuration exists once and both instances are built from it, so the
 * link, image and raw-HTML handling cannot drift between them.
 *
 * @param breaks - Whether a single newline becomes a line break. Off for page
 *   bodies, which follow ordinary Markdown, and on where an author types a
 *   newline into a single-line field and means exactly one.
 */
function createSafeMarked(breaks: boolean) {
  return new Marked({
    breaks,
    renderer: {
      link({ href, title, text }) {
        const safeHref = getSafeConfigHref(href);
        if (!safeHref) return escapeHtml(text);
        const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : "";
        const isExternal = isExternalHref(safeHref);
        const extAttrs = isExternal ? ' rel="noopener noreferrer" target="_blank"' : "";
        return `<a href="${escapeHtmlAttribute(safeHref)}"${titleAttr}${extAttrs}>${escapeHtml(text)}</a>`;
      },
      image({ href, title, text }) {
        // Mirror the link/shortcode allowlist for image src: only same-site /
        // trusted-asset-host URLs. This blocks `data:`/`javascript:` and arbitrary
        // external tracking hosts that marked's default image renderer would emit.
        const safeSrc = getSafeSiteAssetPath(href);
        if (!safeSrc) return escapeHtml(text);
        const titleAttr = title ? ` title="${escapeHtmlAttribute(title)}"` : "";
        return `<img src="${escapeHtmlAttribute(safeSrc)}" alt="${escapeHtmlAttribute(text)}"${titleAttr} loading="lazy" decoding="async" />`;
      },
      html({ text }) {
        return escapeHtml(text);
      },
    },
  }).use(markedFootnote());
}

const markedSafe = createSafeMarked(false);
const markedSafeWithBreaks = createSafeMarked(true);

/**
 * Renders Markdown to HTML, without waiting for anything.
 *
 * The whole pipeline in one place: pull the shortcodes out, render what is
 * left, put them back. A container renders its body by calling this again, so
 * the text inside a stack is treated exactly as the text around it.
 *
 * It can be synchronous because everything that needs fetching is fetched by
 * `renderMarkdown` before the first line is rendered, over the whole source
 * rather than one nesting level of it.
 *
 * @param content - Markdown source text.
 * @param aliases - Optional alias-to-URL map for media shortcodes.
 * @param depth - How many containers this text already sits inside.
 * @param breaks - Whether a single newline becomes a line break.
 */
function renderMarkdownBody(
  content: string,
  aliases: MarkdownMediaAliases | undefined,
  depth: number,
  breaks = false,
): string {
  const { content: withShortcodes, tokens } = extractRenderableShortcodes(content, aliases, depth);
  const renderer = breaks ? markedSafeWithBreaks : markedSafe;
  return injectShortcodes(renderer.parse(withShortcodes) as string, tokens);
}

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
  options: { breaks?: boolean } = {},
): Promise<string> {
  const normalized = normalizeFootnoteSourceHeadings(content);
  // The shortcode renderer below hands back strings and cannot wait, so what it
  // needs is fetched here, where waiting is allowed. Only the icons this text
  // actually names are read, and the search covers the whole source, so an icon
  // inside a container is already here when that container renders.
  await loadDuotoneIcons(iconNamesIn(normalized));
  return renderMarkdownBody(normalized, aliases, 0, options.breaks ?? false);
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
