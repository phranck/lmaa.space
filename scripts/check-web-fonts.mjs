#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const EXPECTED_FONT_FILES = [
  "barlow-400-italic-latin-ext.woff2",
  "barlow-400-italic-latin.woff2",
  "barlow-400-latin-ext.woff2",
  "barlow-400-latin.woff2",
  "barlow-500-italic-latin-ext.woff2",
  "barlow-500-italic-latin.woff2",
  "barlow-500-latin-ext.woff2",
  "barlow-500-latin.woff2",
  "barlow-600-italic-latin-ext.woff2",
  "barlow-600-italic-latin.woff2",
  "barlow-600-latin-ext.woff2",
  "barlow-600-latin.woff2",
  "barlow-condensed-400.woff2",
  "barlow-condensed-500.woff2",
  "barlow-condensed-600.woff2",
  "barlow-condensed-700.woff2",
  "barlow-condensed-800.woff2",
  "dynapuff-500.woff2",
  "dynapuff-600.woff2",
];

export const CRITICAL_FONT_FILES = [
  "barlow-condensed-400.woff2",
  "barlow-condensed-600.woff2",
  "barlow-condensed-700.woff2",
  "dynapuff-500.woff2",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function logicalFontFile(url) {
  const fileName = new URL(url).pathname.split("/").pop() ?? "";
  return EXPECTED_FONT_FILES.find((expectedFile) => {
    const stem = expectedFile.replace(/\.woff2$/, "");
    return new RegExp(`^${escapeRegExp(stem)}\\.[A-Za-z0-9_-]{8,}\\.woff2$`).test(fileName);
  });
}

function extractFontUrls(css, stylesheetUrl) {
  const urls = [];
  const pattern = /url\(\s*(["']?)([^"')]+\.woff2(?:\?[^"')]*)?)\1\s*\)/g;
  for (const match of css.matchAll(pattern)) {
    urls.push(new URL(match[2], stylesheetUrl).href);
  }
  return urls;
}

function collectFontReferences(stylesheets) {
  const fontReferences = new Map();
  for (const { css, url } of stylesheets) {
    invariant(
      !/url\(\s*["']?\/fonts\//.test(css),
      `Stylesheet ${url} contains an unversioned /fonts/ font URL`,
    );
    for (const fontUrl of extractFontUrls(css, url)) {
      const logicalFile = logicalFontFile(fontUrl);
      invariant(logicalFile, `Font URL is not content-hashed or is unexpected: ${fontUrl}`);
      fontReferences.set(logicalFile, fontUrl);
    }
  }

  for (const expectedFile of EXPECTED_FONT_FILES) {
    invariant(
      fontReferences.has(expectedFile),
      `Missing content-hashed font reference for ${expectedFile}`,
    );
  }
  return fontReferences;
}

async function findCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findCssFiles(path)));
    if (entry.isFile() && entry.name.endsWith(".css")) files.push(path);
  }
  return files;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function verifyBuiltFonts(clientDirectory) {
  const resolvedClientDirectory = resolve(clientDirectory);
  invariant(
    !(await pathExists(join(resolvedClientDirectory, "fonts", "fonts.css"))),
    "Build still contains the unversioned public fonts/fonts.css stylesheet",
  );

  const cssFiles = await findCssFiles(resolvedClientDirectory);
  invariant(cssFiles.length > 0, `No CSS files found below ${resolvedClientDirectory}`);
  const stylesheets = await Promise.all(
    cssFiles.map(async (file) => ({
      css: await readFile(file, "utf8"),
      url: new URL(relative(resolvedClientDirectory, file), "https://build.invalid/").href,
    })),
  );
  const fontReferences = collectFontReferences(stylesheets);

  for (const [logicalFile, fontUrl] of fontReferences) {
    const assetPath = join(resolvedClientDirectory, new URL(fontUrl).pathname.replace(/^\//, ""));
    invariant(
      await pathExists(assetPath),
      `Built asset for ${logicalFile} does not exist: ${assetPath}`,
    );
  }

  return { fontCount: fontReferences.size, stylesheetCount: cssFiles.length };
}

function linkTags(html) {
  return html.match(/<link\b[^>]*>/gi) ?? [];
}

function attribute(tag, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function hasRel(tag, value) {
  return (attribute(tag, "rel") ?? "").toLowerCase().split(/\s+/).includes(value);
}

async function fetchChecked(url, init) {
  const response = await fetch(url, init);
  invariant(response.ok, `${init?.method ?? "GET"} ${url} returned ${response.status}`);
  return response;
}

function verifyImmutableCache(response, url) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(/(?:^|,)\s*max-age=(\d+)/i.exec(cacheControl)?.[1] ?? 0);
  invariant(
    /(?:^|,)\s*immutable(?:,|$)/i.test(cacheControl),
    `${url} is missing immutable caching`,
  );
  invariant(maxAge >= 31_536_000, `${url} has insufficient max-age: ${cacheControl || "missing"}`);
}

export async function verifyRemoteFonts(baseUrl) {
  const pageUrl = new URL("/", baseUrl).href;
  const pageResponse = await fetchChecked(pageUrl);
  const html = await pageResponse.text();
  invariant(
    !html.includes("/fonts/fonts.css"),
    `${pageUrl} still links the public font stylesheet`,
  );

  const stylesheetUrls = linkTags(html)
    .filter((tag) => hasRel(tag, "stylesheet"))
    .map((tag) => attribute(tag, "href"))
    .filter(Boolean)
    .map((href) => new URL(href, pageUrl).href);
  invariant(stylesheetUrls.length > 0, `${pageUrl} does not link any stylesheets`);

  const stylesheets = await Promise.all(
    stylesheetUrls.map(async (url) => {
      const response = await fetchChecked(url);
      invariant(
        (response.headers.get("content-type") ?? "").includes("text/css"),
        `${url} is not served as CSS`,
      );
      verifyImmutableCache(response, url);
      return { css: await response.text(), url };
    }),
  );
  const fontReferences = collectFontReferences(stylesheets);

  const preloadReferences = new Map();
  for (const tag of linkTags(html)) {
    if (!hasRel(tag, "preload") || attribute(tag, "as")?.toLowerCase() !== "font") continue;
    const href = attribute(tag, "href");
    if (!href) continue;
    const url = new URL(href, pageUrl).href;
    const logicalFile = logicalFontFile(url);
    invariant(logicalFile, `Font preload is not content-hashed or is unexpected: ${url}`);
    preloadReferences.set(logicalFile, url);
  }

  for (const criticalFile of CRITICAL_FONT_FILES) {
    const preloadUrl = preloadReferences.get(criticalFile);
    invariant(preloadUrl, `Missing content-hashed preload for ${criticalFile}`);
    invariant(
      preloadUrl === fontReferences.get(criticalFile),
      `Preload URL does not match the CSS reference for ${criticalFile}`,
    );
    // Deliberately a GET. The Node adapter attaches the immutable cache header
    // while the file is being streamed, and `send` answers a HEAD before it gets
    // that far, so a HEAD reports `max-age=0` for an asset that a browser
    // receives with `immutable`. Checking with HEAD therefore fails on a header
    // that is correct for every real request.
    const response = await fetchChecked(preloadUrl);
    invariant(
      (response.headers.get("content-type") ?? "").includes("font/woff2"),
      `${preloadUrl} is not served as font/woff2`,
    );
    verifyImmutableCache(response, preloadUrl);
    await response.body?.cancel();
  }

  return { fontCount: fontReferences.size, preloadCount: preloadReferences.size };
}

async function main(args) {
  const [mode, value, ...rest] = args;
  invariant(
    rest.length === 0 && value,
    "Usage: check-web-fonts.mjs --dist <client-dir> | --url <base-url>",
  );

  if (mode === "--dist") {
    const result = await verifyBuiltFonts(value);
    console.log(
      `Verified ${result.fontCount} content-hashed fonts across ${result.stylesheetCount} built stylesheets.`,
    );
    return;
  }
  if (mode === "--url") {
    const result = await verifyRemoteFonts(value);
    console.log(
      `Verified ${result.fontCount} deployed fonts and ${result.preloadCount} immutable preloads.`,
    );
    return;
  }
  throw new Error("Usage: check-web-fonts.mjs --dist <client-dir> | --url <base-url>");
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entryUrl === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(
      `Web-font verification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
