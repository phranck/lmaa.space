#!/usr/bin/env node

/**
 * Renders every image that shows the LMAA marks outside a page: the favicons
 * of the website and the dashboard, the default social image, the email
 * masthead, the README's hero, the Mastodon header, and the marks as PNGs for
 * the media library of the dashboard's social preview editor. All of them are
 * drawn from the drawings in `packages/ui/src/assets/marks`, so a change to a
 * mark reaches every image by running this once more:
 *
 *   node scripts/render-brand-images.mjs
 *
 * `favicons`, `banners` or `media` as the argument renders only that part.
 *
 * The output is committed. The email masthead keeps its name because stored
 * email settings link it by URL. What goes into `brand/` is uploaded by hand
 * to Mastodon and to the dashboard.
 */

import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

const ROOT = new URL("../", import.meta.url);
const MARKS = new URL("packages/ui/src/assets/marks/", ROOT);

/*
 * The themes' colors, written out because librsvg, which sharp draws SVG with,
 * reads no `oklch()`, and these images stand outside any theme. The gold is
 * `--ds-color-brand-500` in `packages/shared/styles/tokens.css`; ink, paper and
 * the dark ground are `--ds-color-ink`, `--ds-color-paper` and the `--ds-bg` of
 * `html.dark` in `apps/frontend/src/styles/global.css`.
 */
const GOLD = "#cea836";
const INK = "#0f0f0f";
const PAPER = "#f4efe6";
const SALON_GROUND = "#1e1c19";

const FAVICON_DIRECTORIES = ["apps/frontend/public", "apps/dashboard/public"];
const FAVICON_PNG_SIZE = 64;

/*
 * The wordmark over the claim, centered as one block, in the proportion the
 * hero shows them at 1440 px: the claim's letters run about 1.05 times as wide
 * as the wordmark, and the gap from the foot of the wordmark to the top of the
 * claim's letters is 0.107 of the wordmark's width. Both drawings are boxed by
 * their own ink, so their boxes place them.
 */
const CLAIM_WIDTH_SHARE = 1.05;
const GAP_SHARE = 0.107;
const SOCIAL_IMAGE = { width: 1200, height: 630, wordmarkWidth: 640 };
const EMAIL_MASTHEAD = { width: 1200, height: 300, wordmarkWidth: 400 };
// Mastodon scales every profile header to 1500 by 500, and X takes the same.
const PROFILE_HEADER = { width: 1500, height: 500, wordmarkWidth: 640 };

/*
 * Each banner and where it goes; the extension decides the format. The README
 * shows the social image with its corners cut into the file, because GitHub
 * strips the style a radius would need. The README shows it 860 px wide, so
 * 33 px here are 24 px on screen.
 */
const BANNERS = [
  { file: "apps/frontend/public/og-image.jpg", layout: SOCIAL_IMAGE },
  { file: "apps/frontend/public/email-masthead.jpg", layout: EMAIL_MASTHEAD },
  { file: ".github/assets/hero.png", layout: SOCIAL_IMAGE, cornerRadius: 33 },
  { file: "brand/mastodon-header.png", layout: PROFILE_HEADER },
];

/*
 * The marks as PNGs with a transparent ground, for the media library of the
 * dashboard's social preview editor, which takes no SVG. Each is drawn in the
 * colors the banners give it, at the width given here.
 */
const MEDIA_IMAGES = [
  { file: "brand/lmaa-icon.png", drawing: "icon", width: 512 },
  { file: "brand/lmaa-wordmark.png", drawing: "wordmark", width: 1200 },
  { file: "brand/lmaa-claim.png", drawing: "claim", width: 1200 },
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
    `<style>.lmaa-icon-head { fill: ${INK}; stroke: ${INK}; stroke-width: 1px; }</style>`,
    place(icon, 0, 0, size, GOLD),
    "</svg>",
    "",
  ].join("\n");
}

/**
 * A banner: the wordmark in gold over the claim on the dark ground, the
 * claim in paper with its last word in gold, as the hero sets it.
 *
 * @param {typeof SOCIAL_IMAGE} layout - Size of the image and width of the wordmark.
 * @param {number} cornerRadius - Radius of the corners cut out of it, or 0.
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 * @returns {string} A complete SVG document.
 */
function bannerSvg(layout, cornerRadius, wordmark, claim) {
  const claimWidth = layout.wordmarkWidth * CLAIM_WIDTH_SHARE;
  const gap = layout.wordmarkWidth * GAP_SHARE;
  const wordmarkHeight = heightAt(wordmark, layout.wordmarkWidth);
  const claimHeight = heightAt(claim, claimWidth);
  const top = (layout.height - wordmarkHeight - gap - claimHeight) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">`,
    `<style>#highlight { color: ${GOLD}; }</style>`,
    `<rect width="${layout.width}" height="${layout.height}" rx="${cornerRadius}" fill="${SALON_GROUND}"/>`,
    place(wordmark, (layout.width - layout.wordmarkWidth) / 2, top, layout.wordmarkWidth, GOLD),
    place(claim, (layout.width - claimWidth) / 2, top + wordmarkHeight + gap, claimWidth, PAPER),
    "</svg>",
  ].join("\n");
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
 * Writes the social image, the email masthead and the README's hero.
 *
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing.
 */
async function renderBanners(wordmark, claim) {
  for (const { file, layout, cornerRadius = 0 } of BANNERS) {
    const image = sharp(Buffer.from(bannerSvg(layout, cornerRadius, wordmark, claim)));
    const encoded = file.endsWith(".png")
      ? image.png()
      : image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    await encoded.toFile(new URL(file, ROOT).pathname);
    console.log(file);
  }
}

/**
 * Writes the icon, the wordmark and the claim as PNGs with a transparent
 * ground: the icon and the wordmark in gold, with the head cut out, and the
 * claim in paper with its last word in gold.
 *
 * @param {Record<string, {viewBox: number[], content: string}>} drawings - The
 *   drawings by the names `MEDIA_IMAGES` uses.
 */
async function renderMediaImages(drawings) {
  for (const { file, drawing, width } of MEDIA_IMAGES) {
    const source = drawings[drawing];
    const height = Math.ceil(heightAt(source, width));
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
      `<style>#highlight { color: ${GOLD}; }</style>`,
      place(source, 0, 0, width, drawing === "claim" ? PAPER : GOLD),
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
if (only === undefined || only === "media") await renderMediaImages({ icon, wordmark, claim });
