#!/usr/bin/env node

/**
 * Renders every image that shows the LMAA marks outside a page: the favicons
 * of the website and the dashboard, the default social image, the email
 * masthead, the README's hero, the GitHub preview, the Mastodon and Bluesky
 * banners and avatars, and the marks as PNGs for the media library of the
 * dashboard's social preview editor. All of them are drawn from the drawings
 * in `packages/ui/src/assets/marks`, so a change to a mark reaches every image
 * by running this once more:
 *
 *   node scripts/render-brand-images.mjs
 *
 * `favicons`, `banners` or `media` as the argument renders only that part; the
 * avatars belong to `media`.
 *
 * The output is committed. The email masthead keeps its name because stored
 * email settings link it by URL. What goes into `brand/` is uploaded by hand
 * to Mastodon, Bluesky, GitHub and the dashboard.
 */

import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

const ROOT = new URL("../", import.meta.url);
const MARKS = new URL("packages/ui/src/assets/marks/", ROOT);

/*
 * The themes' colors, written out because librsvg, which sharp draws SVG with,
 * reads no `oklch()`, and these images stand outside any theme. The gold is
 * `--ds-color-brand-500` in `packages/shared/styles/tokens.css`; ink and paper
 * are `--ds-color-ink` and `--ds-color-paper` in
 * `apps/frontend/src/styles/global.css`.
 */
const GOLD = "#cea836";
const INK = "#0f0f0f";
const PAPER = "#f4efe6";

const FAVICON_DIRECTORIES = ["apps/frontend/public", "apps/dashboard/public"];
const FAVICON_PNG_SIZE = 64;

/*
 * The banners stand in the shop window: Taylor Vick's photograph of a shop
 * front, cropped from its middle, under the veil the home page's head lays over
 * its photographs, `--ds-photo-veil` in `global.css`. The claim takes the
 * hero's light grey, `--ds-photo-text-muted`, with its last word in gold.
 */
const SHOP_WINDOW = new URL("brand/shop-window.jpg", ROOT);
const PHOTO_VEIL = "#0c0a09";
const PHOTO_VEIL_OPACITY = 0.7;
const PHOTO_TEXT = "#e7e5e4";

/*
 * A gold line, fading out at both ends, stands between the wordmark and the
 * claim, as it does between the large parts of the site.
 */
const RULE_THICKNESS = 2;

/*
 * Stacked: the wordmark over the line over the claim, centered as one block,
 * in the proportions of the approved proposal. The claim's letters run 1.263
 * times as wide as the wordmark, the gap between the two is 0.172 of the
 * wordmark's width with the line in its middle, and the line runs 1.067 times
 * as wide as the claim. Both drawings are boxed by their own ink.
 */
const STACK = { claimShare: 1.263, gapShare: 0.172, ruleShare: 1.067 };

/*
 * In a row: the wordmark, the line turned upright, and the claim, all on the
 * middle line. Mastodon's web view shows a header only as a strip 120 to 160
 * px tall cut from its middle, so a stacked block would lose its top and its
 * foot there. The claim runs 1.164 times as wide as the wordmark, each gap is
 * 0.1 of the wordmark's width, and the line is 0.34 of the image tall.
 */
const ROW = { claimShare: 1.164, gapShare: 0.1, ruleHeightShare: 0.34 };

const SOCIAL_IMAGE = { width: 1200, height: 630, wordmarkWidth: 552, arrangement: STACK };
const EMAIL_MASTHEAD = { width: 1200, height: 300, wordmarkWidth: 400, arrangement: STACK };
// GitHub's social preview, which it shows best at 1280 by 640.
const GITHUB_PREVIEW = { width: 1280, height: 640, wordmarkWidth: 589, arrangement: STACK };
// Mastodon scales every profile header to 1500 by 500, and X takes the same.
const PROFILE_HEADER = { width: 1500, height: 500, wordmarkWidth: 450, arrangement: ROW };
// Bluesky crops its banner to 3:1 and takes at most 2000 px on the long side.
const BLUESKY_BANNER = { width: 2000, height: 667, wordmarkWidth: 600, arrangement: ROW };

/*
 * Each banner and where it goes; the extension decides the format. A banner is
 * a photograph, so it is a JPEG wherever no transparency is needed: GitHub and
 * Bluesky take at most 1 MB. The README shows the social image with its
 * corners cut into the file, because GitHub strips the style a radius would
 * need, so that one is a PNG, with its colors reduced to a palette to keep it
 * small. The README shows it 860 px wide, so 33 px here are 24 px on screen.
 */
const BANNERS = [
  { file: "apps/frontend/public/og-image.jpg", layout: SOCIAL_IMAGE },
  { file: "apps/frontend/public/email-masthead.jpg", layout: EMAIL_MASTHEAD },
  { file: ".github/assets/hero.png", layout: SOCIAL_IMAGE, cornerRadius: 33 },
  { file: "brand/github-preview.jpg", layout: GITHUB_PREVIEW },
  { file: "brand/mastodon-header.jpg", layout: PROFILE_HEADER },
  { file: "brand/bluesky-banner.jpg", layout: BLUESKY_BANNER },
];

/*
 * The avatars: the icon in gold with the llama's head in ink, as the favicon
 * shows it, on a gold ground so a platform's rounding cuts gold. Mastodon
 * rounds an avatar's corners by 8 px, so the icon fills it. Bluesky shows it
 * round, so the icon shrinks to keep the ears inside the circle.
 */
const AVATARS = [
  { file: "brand/mastodon-avatar.png", size: 400, iconShare: 1 },
  { file: "brand/bluesky-avatar.png", size: 1000, iconShare: 0.82 },
];

/*
 * The marks as PNGs with a transparent ground, at the width given here. The
 * gold ones, and the claim in paper, are for the media library of the
 * dashboard's social preview editor, which takes no SVG, and match the
 * banners. The ink ones fill the squircle and the letters in ink and the
 * llama's head in gold, and the gold ones swap the two colors. Without a head
 * color, the head stays cut out.
 */
const MEDIA_IMAGES = [
  { file: "brand/lmaa-icon.png", drawing: "icon", width: 512, color: GOLD },
  { file: "brand/lmaa-wordmark.png", drawing: "wordmark", width: 1200, color: GOLD },
  { file: "brand/lmaa-claim.png", drawing: "claim", width: 1200, color: PAPER },
  { file: "brand/lmaa-icon-ink.png", drawing: "icon", width: 512, color: INK, head: GOLD },
  { file: "brand/lmaa-wordmark-ink.png", drawing: "wordmark", width: 1200, color: INK, head: GOLD },
  { file: "brand/lmaa-icon-gold.png", drawing: "icon", width: 512, color: GOLD, head: INK },
  {
    file: "brand/lmaa-wordmark-gold.png",
    drawing: "wordmark",
    width: 1200,
    color: GOLD,
    head: INK,
  },
];
const JPEG_QUALITY = 90;

/**
 * A drawing from the marks folder, split into its viewBox and its content so
 * that it can be placed inside another SVG.
 *
 * @param {string} name - The file name, such as `lmaa-icon.svg`.
 * @returns {Promise<{viewBox: number[], content: string}>} The viewBox as
 *   x, y, width and height, and the markup between the svg tags.
 */
async function readDrawing(name) {
  const source = await readFile(new URL(name, MARKS), "utf8");
  const match = source.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
  if (!match) throw new Error(`${name} has no svg element with a viewBox`);
  return { viewBox: match[1].split(/\s+/).map(Number), content: match[2] };
}

/**
 * A drawing placed at a width, its height following from its own proportion.
 *
 * @param {{viewBox: number[], content: string}} drawing - The drawing.
 * @param {number} x - Left edge in the outer image.
 * @param {number} y - Top edge in the outer image.
 * @param {number} width - Width in the outer image.
 * @param {string} color - The color `currentColor` resolves to inside it.
 * @returns {string} A nested svg element.
 */
function place(drawing, x, y, width, color) {
  const [, , viewWidth, viewHeight] = drawing.viewBox;
  const height = (width * viewHeight) / viewWidth;
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${drawing.viewBox.join(" ")}" color="${color}">${drawing.content}</svg>`;
}

/**
 * The height a drawing takes at a width.
 *
 * @param {{viewBox: number[]}} drawing - The drawing.
 * @param {number} width - The width it is placed at.
 */
function heightAt(drawing, width) {
  return (width * drawing.viewBox[3]) / drawing.viewBox[2];
}

/**
 * A style rule that fills the llama's head, the path `lmaa-icon-head` that the
 * icon and the wordmark carry unfilled. A stroke of one unit closes the seam
 * between the head and the edge of its cut-out, which would otherwise show
 * the ground as a hairline around it.
 *
 * @param {string} color - The head's color.
 * @returns {string} A CSS rule.
 */
function headFill(color) {
  return `.lmaa-icon-head { fill: ${color}; stroke: ${color}; stroke-width: 1px; }`;
}

/**
 * The favicon: the icon in gold with the llama's head in ink. A tab bar is
 * light or dark depending on the browser, so the head is filled rather than
 * left open, and the icon reads the same on either. The drawing carries the
 * head as a path of its own for this, the one the website's header fills as
 * well.
 *
 * @param {{viewBox: number[], content: string}} icon - The icon drawing.
 * @returns {string} A complete SVG document.
 */
function faviconSvg(icon) {
  const [, , size] = icon.viewBox;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox.join(" ")}">`,
    `<style>${headFill(INK)}</style>`,
    place(icon, 0, 0, size, GOLD),
    "</svg>",
    "",
  ].join("\n");
}

/**
 * A banner: the shop window under its veil, and over it the wordmark in gold,
 * the fading line and the claim in light grey with its last word in gold,
 * stacked or in a row as the layout says.
 *
 * @param {typeof SOCIAL_IMAGE} layout - Size of the image, width of the wordmark and arrangement.
 * @param {number} cornerRadius - Radius of the corners cut out of it, or 0.
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 * @param {string} photo - The photograph as a `data:` address, embedded so the
 *   SVG that sharp draws depends on no file beside it.
 * @returns {string} A complete SVG document.
 */
function bannerSvg(layout, cornerRadius, wordmark, claim, photo) {
  const { width, height } = layout;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    "<defs>",
    `<clipPath id="frame"><rect width="${width}" height="${height}" rx="${cornerRadius}"/></clipPath>`,
    fadingGradient("rule-across", "x2"),
    fadingGradient("rule-down", "y2"),
    "</defs>",
    `<style>#highlight { color: ${GOLD}; }</style>`,
    `<g clip-path="url(#frame)">`,
    `<image href="${photo}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`,
    `<rect width="${width}" height="${height}" fill="${PHOTO_VEIL}" fill-opacity="${PHOTO_VEIL_OPACITY}"/>`,
    "</g>",
    ...(layout.arrangement === ROW
      ? rowMarks(layout, wordmark, claim)
      : stackMarks(layout, wordmark, claim)),
    "</svg>",
  ].join("\n");
}

/**
 * A gradient in gold that is clear at both ends and full in the middle, for
 * the line between the wordmark and the claim.
 *
 * @param {string} id - The gradient's id.
 * @param {"x2" | "y2"} direction - `x2` to run across, `y2` to run down.
 * @returns {string} A linearGradient element.
 */
function fadingGradient(id, direction) {
  const end = direction === "x2" ? 'x2="1" y2="0"' : 'x2="0" y2="1"';
  return [
    `<linearGradient id="${id}" x1="0" y1="0" ${end}>`,
    `<stop offset="0" stop-color="${GOLD}" stop-opacity="0"/>`,
    `<stop offset="0.5" stop-color="${GOLD}"/>`,
    `<stop offset="1" stop-color="${GOLD}" stop-opacity="0"/>`,
    "</linearGradient>",
  ].join("");
}

/**
 * The wordmark over the line over the claim, centered as one block.
 *
 * @param {typeof SOCIAL_IMAGE} layout - Size of the image and width of the wordmark.
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 * @returns {string[]} The elements, in drawing order.
 */
function stackMarks(layout, wordmark, claim) {
  const { width, height, wordmarkWidth } = layout;
  const claimWidth = wordmarkWidth * STACK.claimShare;
  const gap = wordmarkWidth * STACK.gapShare;
  const ruleWidth = claimWidth * STACK.ruleShare;
  const wordmarkHeight = heightAt(wordmark, wordmarkWidth);
  const top = (height - wordmarkHeight - gap - heightAt(claim, claimWidth)) / 2;
  return [
    place(wordmark, (width - wordmarkWidth) / 2, top, wordmarkWidth, GOLD),
    `<rect x="${(width - ruleWidth) / 2}" y="${top + wordmarkHeight + (gap - RULE_THICKNESS) / 2}" width="${ruleWidth}" height="${RULE_THICKNESS}" fill="url(#rule-across)"/>`,
    place(claim, (width - claimWidth) / 2, top + wordmarkHeight + gap, claimWidth, PHOTO_TEXT),
  ];
}

/**
 * The wordmark, the upright line and the claim in one row on the middle line.
 *
 * @param {typeof PROFILE_HEADER} layout - Size of the image and width of the wordmark.
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 * @returns {string[]} The elements, in drawing order.
 */
function rowMarks(layout, wordmark, claim) {
  const { width, height, wordmarkWidth } = layout;
  const claimWidth = wordmarkWidth * ROW.claimShare;
  const gap = wordmarkWidth * ROW.gapShare;
  const ruleHeight = height * ROW.ruleHeightShare;
  const left = (width - wordmarkWidth - 2 * gap - RULE_THICKNESS - claimWidth) / 2;
  const ruleX = left + wordmarkWidth + gap;
  return [
    place(wordmark, left, (height - heightAt(wordmark, wordmarkWidth)) / 2, wordmarkWidth, GOLD),
    `<rect x="${ruleX}" y="${(height - ruleHeight) / 2}" width="${RULE_THICKNESS}" height="${ruleHeight}" fill="url(#rule-down)"/>`,
    place(
      claim,
      ruleX + RULE_THICKNESS + gap,
      (height - heightAt(claim, claimWidth)) / 2,
      claimWidth,
      PHOTO_TEXT,
    ),
  ];
}

/**
 * Writes the favicon as SVG and as PNG into every app that serves one.
 *
 * @param {{viewBox: number[], content: string}} icon - The icon drawing.
 */
async function renderFavicons(icon) {
  const svg = faviconSvg(icon);
  const png = await sharp(Buffer.from(svg), { density: 72 })
    .resize(FAVICON_PNG_SIZE, FAVICON_PNG_SIZE)
    .png()
    .toBuffer();
  for (const directory of FAVICON_DIRECTORIES) {
    await writeFile(new URL(`${directory}/favicon.svg`, ROOT), svg);
    await writeFile(new URL(`${directory}/favicon.png`, ROOT), png);
    console.log(`${directory}/favicon.svg and favicon.png`);
  }
}

/**
 * Writes every banner in `BANNERS`, each on the shop window.
 *
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 */
async function renderBanners(wordmark, claim) {
  const photo = `data:image/jpeg;base64,${(await readFile(SHOP_WINDOW)).toString("base64")}`;
  for (const { file, layout, cornerRadius = 0 } of BANNERS) {
    const image = sharp(Buffer.from(bannerSvg(layout, cornerRadius, wordmark, claim, photo)));
    const encoded = file.endsWith(".png")
      ? image.png({ palette: true, compressionLevel: 9 })
      : image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    await encoded.toFile(new URL(file, ROOT).pathname);
    console.log(file);
  }
}

/**
 * Writes the avatars: the icon in gold with the head in ink, centered on a
 * gold square at the share of its size `AVATARS` gives.
 *
 * @param {{viewBox: number[], content: string}} icon - The icon drawing.
 */
async function renderAvatars(icon) {
  for (const { file, size, iconShare } of AVATARS) {
    const iconSize = size * iconShare;
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`,
      `<style>${headFill(INK)}</style>`,
      `<rect width="${size}" height="${size}" fill="${GOLD}"/>`,
      place(icon, (size - iconSize) / 2, (size - iconSize) / 2, iconSize, GOLD),
      "</svg>",
    ].join("\n");
    await sharp(Buffer.from(svg)).png().toFile(new URL(file, ROOT).pathname);
    console.log(file);
  }
}

/**
 * Writes the marks as PNGs with a transparent ground, in the colors
 * `MEDIA_IMAGES` gives each. The claim's last word is always gold.
 *
 * @param {Record<string, {viewBox: number[], content: string}>} drawings - The
 *   drawings by the names `MEDIA_IMAGES` uses.
 */
async function renderMediaImages(drawings) {
  for (const { file, drawing, width, color, head } of MEDIA_IMAGES) {
    const source = drawings[drawing];
    const height = Math.ceil(heightAt(source, width));
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
      `<style>#highlight { color: ${GOLD}; }${head ? ` ${headFill(head)}` : ""}</style>`,
      place(source, 0, 0, width, color),
      "</svg>",
    ].join("\n");
    await sharp(Buffer.from(svg)).png().toFile(new URL(file, ROOT).pathname);
    console.log(file);
  }
}

const [icon, wordmark, claim] = await Promise.all(
  ["lmaa-icon.svg", "lmaa-wordmark.svg", "lmaa-claim.svg"].map(readDrawing),
);
const only = process.argv[2];
if (only !== undefined && !["favicons", "banners", "media"].includes(only)) {
  throw new Error(`unknown argument ${only}: give favicons, banners, media, or nothing for all`);
}
if (only === undefined || only === "favicons") await renderFavicons(icon);
if (only === undefined || only === "banners") await renderBanners(wordmark, claim);
if (only === undefined || only === "media") {
  await renderMediaImages({ icon, wordmark, claim });
  await renderAvatars(icon);
}
