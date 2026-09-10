// The four shortcodes that point at something outside the text. Each one
// carries its target after a colon, as in `[[image:/uploads/…]]`, which is what
// sets them apart from every other shortcode in the registry.

import { MARKDOWN_SHORTCODE_TOKENS } from "./tokens.js";
import type { MarkdownShortcodeDefinition } from "./types.js";

/** An uploaded image, optionally with a caption and a fixed size. */
export const IMAGE_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.image,
  renderMode: "html",
  target: "required",
  placement: "block",
  label: "Bild",
  description: "Zeigt ein hochgeladenes Bild, wahlweise mit Bildunterschrift und fester Grösse.",
  examples: ["[[image:/uploads/...]]"],
  params: [
    {
      name: "alt",
      type: "string",
      label: "Alternativtext",
    },
    {
      name: "caption",
      type: "string",
      label: "Bildunterschrift",
    },
    {
      name: "width",
      type: "integer",
      min: 1,
      max: 4096,
      label: "Breite in Pixeln",
    },
    {
      name: "height",
      type: "integer",
      min: 1,
      max: 4096,
      label: "Höhe in Pixeln",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** An uploaded PDF, linked with a preview. */
export const PDF_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.pdf,
  renderMode: "html",
  target: "required",
  placement: "block",
  label: "PDF",
  description: "Verlinkt ein hochgeladenes PDF mit Vorschau.",
  examples: ["[[pdf:/uploads/...]]"],
  params: [
    {
      name: "label",
      type: "string",
      label: "Beschriftung",
    },
    {
      name: "title",
      type: "string",
      label: "Überschrift",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** A video from the site's own media library. */
export const HLS_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.hls,
  renderMode: "html",
  target: "required",
  placement: "block",
  label: "Video",
  description: "Spielt ein Video aus dem eigenen Medienbestand ab.",
  examples: ["[[hls:alias]]"],
  params: [
    {
      name: "title",
      type: "string",
      label: "Überschrift",
    },
    {
      name: "caption",
      type: "string",
      label: "Bildunterschrift",
    },
    {
      name: "aspect",
      type: "string",
      label: "Seitenverhältnis",
    },
    {
      name: "poster",
      type: "string",
      label: "Vorschaubild",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;

/** An embedded YouTube video. */
export const YOUTUBE_SHORTCODE = {
  token: MARKDOWN_SHORTCODE_TOKENS.youtube,
  renderMode: "html",
  target: "required",
  placement: "block",
  label: "YouTube",
  description: "Bettet ein YouTube-Video ein.",
  examples: ["[[youtube:url]]"],
  params: [
    {
      name: "title",
      type: "string",
      label: "Überschrift",
    },
    {
      name: "caption",
      type: "string",
      label: "Bildunterschrift",
    },
    {
      name: "aspect",
      type: "string",
      label: "Seitenverhältnis",
    },
  ],
} as const satisfies MarkdownShortcodeDefinition;
