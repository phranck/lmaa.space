#!/usr/bin/env node

/**
 * Renders every image that shows the LMAA marks outside a page: the favicons
 * of the website and the dashboard, the default social image, the email
 * masthead and the README's hero. All of them are drawn from the drawings in
 * `packages/ui/src/assets/marks`, so a change to a mark reaches every image by
 * running this once more:
 *
 *   node scripts/render-brand-images.mjs
 *
 * The output is committed. The email masthead keeps its name because stored
 * email settings link it by URL.
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
 * The wordmark over the claim, their ink centered as one block. The sizes keep
 * the hero's proportion, where the claim runs about 1.8 times as wide as the
 * wordmark's box. The gap runs from the foot of the wordmark's letters to the
 * top of the claim's.
 */
const SOCIAL_IMAGE = { width: 1200, height: 630, wordmarkWidth: 520, claimWidth: 940, gap: 80 };
const EMAIL_MASTHEAD = { width: 1200, height: 300, wordmarkWidth: 320, claimWidth: 560, gap: 46 };

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
 * The favicon: the icon in gold with the L in ink. A tab bar is light or dark
 * depending on the browser, so the L is filled rather than left open, and the
 * icon reads the same on either. The drawing carries the letter as a path of
 * its own for this, the one the website's header fills as well.
 *
 * @param {{viewBox: number[], content: string}} icon - The icon drawing.
 * @returns {string} A complete SVG document.
 */
function faviconSvg(icon) {
  const [, , size] = icon.viewBox;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox.join(" ")}">`,
    `<style>.lmaa-icon-letter { fill: ${INK}; stroke: ${INK}; stroke-width: 1px; }</style>`,
    place(icon, 0, 0, size, GOLD),
    "</svg>",
    "",
  ].join("\n");
}

/**
 * How far a drawing's letters stand inside its box, top and bottom, as
 * shares of its height. The wordmark carries a margin around its letters and
 * the claim carries none, so the two are placed by their letters rather than
 * by their boxes. Measured from the drawing itself, so a redrawn mark needs no
 * new figures here.
 *
 * @param {{viewBox: number[], content: string}} drawing - The drawing.
 * @returns {Promise<{top: number, bottom: number}>} The two insets.
 */
async function inkInsets(drawing) {
  const [, , width, height] = drawing.viewBox;
  const document = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${place(drawing, 0, 0, width, "#000")}</svg>`;
  const { info } = await sharp(Buffer.from(document))
    .flatten({ background: "#fff" })
    .trim()
    .toBuffer({ resolveWithObject: true });
  if (info.trimOffsetTop === undefined) throw new Error("sharp reported no trim offset");
  const top = -info.trimOffsetTop / height;
  return { top, bottom: 1 - top - info.height / height };
}

/**
 * A banner: the wordmark in gold over the claim on the dark ground, the
 * claim in paper with its last word in gold, as the hero sets it.
 *
 * @param {typeof SOCIAL_IMAGE} layout - Size and layout of the image.
 * @param {number} cornerRadius - Radius of the corners cut out of it, or 0.
 * @param {{viewBox: number[], content: string}} wordmark - The wordmark drawing.
 * @param {{top: number, bottom: number}} wordmarkInsets - Its letters' insets.
 * @param {{viewBox: number[], content: string}} claim - The claim drawing,
 *   whose box is its letters.
 * @returns {string} A complete SVG document.
 */
function bannerSvg(layout, cornerRadius, wordmark, wordmarkInsets, claim) {
  const wordmarkHeight = heightAt(wordmark, layout.wordmarkWidth);
  const wordmarkInkTop = wordmarkInsets.top * wordmarkHeight;
  const wordmarkInkHeight = (1 - wordmarkInsets.top - wordmarkInsets.bottom) * wordmarkHeight;
  const claimHeight = heightAt(claim, layout.claimWidth);
  const inkTop = (layout.height - wordmarkInkHeight - layout.gap - claimHeight) / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">`,
    `<style>#highlight { color: ${GOLD}; }</style>`,
    `<rect width="${layout.width}" height="${layout.height}" rx="${cornerRadius}" fill="${SALON_GROUND}"/>`,
    place(
      wordmark,
      (layout.width - layout.wordmarkWidth) / 2,
      inkTop - wordmarkInkTop,
      layout.wordmarkWidth,
      GOLD,
    ),
    place(
      claim,
      (layout.width - layout.claimWidth) / 2,
      inkTop + wordmarkInkHeight + layout.gap,
      layout.claimWidth,
      PAPER,
    ),
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
  const wordmarkInsets = await inkInsets(wordmark);
  for (const { file, layout, cornerRadius = 0 } of BANNERS) {
    const image = sharp(
      Buffer.from(bannerSvg(layout, cornerRadius, wordmark, wordmarkInsets, claim)),
    );
    const encoded = file.endsWith(".png")
      ? image.png()
      : image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    await encoded.toFile(new URL(file, ROOT).pathname);
    console.log(file);
  }
}

const [icon, wordmark, claim] = await Promise.all(
  ["lmaa-icon.svg", "lmaa-wordmark.svg", "lmaa-claim.svg"].map(readDrawing),
);
await renderFavicons(icon);
await renderBanners(wordmark, claim);
