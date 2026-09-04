#!/usr/bin/env node
/**
 * Fails when an analytics file served to visitors no longer matches the
 * integrity hash the page pins it to.
 *
 * These files are loaded from a host of their own and run with full access to
 * the page, so the markup states their hash and the browser refuses anything
 * else. That protection has a cost: updating the analytics instance changes
 * the files, the hashes stop matching, and the browser then drops them without
 * telling anybody. Analytics stop, the page looks fine, and the numbers are
 * simply missing until somebody notices they are.
 *
 * This turns that into a red run. It reads the tags from the deployed page
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

/**
 * The analytics files the page may pin, in the order they are reported.
 *
 * The tracker has to be there: a page without it records nothing, and that is
 * a failure whatever the hashes say. The recorder is checked when the page
 * loads it, because whether a site records sessions is a decision rather than
 * a fault, and a check has no business insisting on it.
 */
const PINNED_SCRIPTS = [
  { name: "analytics script", path: "/script.js", required: true },
  { name: "session recorder", path: "/recorder.js", required: false },
];

function readScriptTag(html, path) {
  const tags = html.match(/<script[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const src = tag.match(/\ssrc="([^"]+)"/i)?.[1];
    if (!src || !src.includes(path)) continue;
    return { src, integrity: tag.match(/\sintegrity="([^"]+)"/i)?.[1] ?? null };
  }
  return null;
}

function subresourceHash(algorithm, bytes) {
  return `${algorithm}-${createHash(algorithm).update(bytes).digest("base64")}`;
}

const pageUrl = parseUrlArgument(process.argv.slice(2));

const pageResponse = await fetchWithTimeout(pageUrl, `page ${pageUrl}`);
const html = await pageResponse.text();

let failed = false;

for (const { name, path, required } of PINNED_SCRIPTS) {
  const tag = readScriptTag(html, path);

  if (!tag) {
    if (required) {
      console.error(`no ${name} tag found on ${pageUrl}`);
      failed = true;
    } else {
      console.log(`skip ${name} is not loaded by ${pageUrl}`);
    }
    continue;
  }

  if (!tag.integrity) {
    console.error(
      `${name} on ${pageUrl} carries no integrity attribute, so the browser\n` +
        `runs whatever ${tag.src} returns`,
    );
    failed = true;
    continue;
  }

  const algorithm = tag.integrity.split("-")[0];
  if (!["sha256", "sha384", "sha512"].includes(algorithm)) {
    console.error(`unsupported integrity algorithm on ${name}: ${tag.integrity}`);
    failed = true;
    continue;
  }

  const scriptResponse = await fetchWithTimeout(tag.src, `${name} ${tag.src}`);
  const served = subresourceHash(algorithm, Buffer.from(await scriptResponse.arrayBuffer()));

  if (served !== tag.integrity) {
    console.error(
      `the ${name} changed and the page still pins the old hash, so browsers\n` +
        `are dropping it and it is doing nothing.\n\n` +
        `  script:   ${tag.src}\n` +
        `  pinned:   ${tag.integrity}\n` +
        `  served:   ${served}\n\n` +
        `Put the served value into csp.ts and deploy.`,
    );
    failed = true;
    continue;
  }

  console.log(`ok   ${name} matches its pinned hash (${algorithm}, ${tag.src})`);
}

if (failed) {
  process.exit(1);
}