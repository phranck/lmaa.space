#!/usr/bin/env node
/**
 * Fails when the analytics script served to visitors no longer matches the
 * integrity hash the page pins it to.
 *
 * The script is loaded from a host of its own and runs with full access to the
 * page, so the markup states its hash and the browser refuses anything else.
 * That protection has a cost: updating the analytics instance changes the file,
 * the hash stops matching, and the browser then drops the script without
 * telling anybody. Analytics stop, the page looks fine, and the numbers are
 * simply missing until somebody notices they are.
 *
 * This turns that into a red run. It reads the tag from the deployed page
 * rather than from the source, so it checks what visitors actually receive.
 */
import { createHash } from "node:crypto";

const DEFAULT_URL = "https://lmaa.space";
const FETCH_TIMEOUT_MS = 15_000;

function parseUrlArgument(argv) {
  const index = argv.indexOf("--url");
  if (index === -1) return DEFAULT_URL;

  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error("--url needs a value, for example --url https://lmaa.space");
    process.exit(2);
  }
  return value.replace(/\/+$/, "");
}

async function fetchWithTimeout(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${label} answered ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function readAnalyticsTag(html) {
  const tags = html.match(/<script[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = tag.match(/\ssrc="([^"]+)"/i)?.[1];
    if (!src || !src.includes("/script.js")) continue;
    return { src, integrity: tag.match(/\sintegrity="([^"]+)"/i)?.[1] ?? null };
  }
  return null;
}

function subresourceHash(algorithm, bytes) {
  return `${algorithm}-${createHash(algorithm).update(bytes).digest("base64")}`;
}

const pageUrl = parseUrlArgument(process.argv.slice(2));

const pageResponse = await fetchWithTimeout(pageUrl, `page ${pageUrl}`);
const tag = readAnalyticsTag(await pageResponse.text());

if (!tag) {
  console.error(`no analytics script tag found on ${pageUrl}`);
  process.exit(1);
}

if (!tag.integrity) {
  console.error(
    `analytics script on ${pageUrl} carries no integrity attribute, so the browser\n` +
      `runs whatever ${tag.src} returns`,
  );
  process.exit(1);
}

const algorithm = tag.integrity.split("-")[0];
if (!["sha256", "sha384", "sha512"].includes(algorithm)) {
  console.error(`unsupported integrity algorithm: ${tag.integrity}`);
  process.exit(1);
}

const scriptResponse = await fetchWithTimeout(tag.src, `script ${tag.src}`);
const served = subresourceHash(algorithm, Buffer.from(await scriptResponse.arrayBuffer()));

if (served !== tag.integrity) {
  console.error(
    `analytics script changed and the page still pins the old hash, so browsers\n` +
      `are dropping it and no events are being recorded.\n\n` +
      `  script:   ${tag.src}\n` +
      `  pinned:   ${tag.integrity}\n` +
      `  served:   ${served}\n\n` +
      `Put the served value into ANALYTICS_SCRIPT_INTEGRITY in\n` +
      `apps/frontend/src/lib/csp.ts and deploy.`,
  );
  process.exit(1);
}

console.log(`ok   analytics script matches its pinned hash (${algorithm}, ${tag.src})`);
