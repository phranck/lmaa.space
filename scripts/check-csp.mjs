#!/usr/bin/env node
/**
 * Loads pages in a browser and fails when the Content Security Policy blocks
 * anything the site needs.
 *
 * The policy is built from hashes Astro computes at build time. Whether those
 * hashes cover everything the page actually loads can only be answered by a
 * browser, because three of the categories involved are invisible to any static
 * check: inline `style` attributes, styles injected by client-only islands after
 * hydration, and anything a third-party script adds at runtime.
 *
 * All three went wrong on 2026-08-07. Hashing `style-src` blocked every inline
 * `style` attribute, which collapsed the footer from three columns to one and
 * stripped the support button's colour, and the map's `<style>` element was
 * created in the browser where no build-time hash could exist, so the layer
 * switcher and the zoom controls lost their styling. Every other gate was green
 * and the report came from a person looking at the page.
 *
 * Runs against a deployed site rather than a local build, because the routes
 * that matter need real data to render their islands at all.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const DEBUG_PORT = 9412;
const PAGE_SETTLE_MS = 6000;
const VIEWPORT = "1440,900";

/** Places a browser is usually found, in the order they are tried. */
const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
].filter(Boolean);

function resolveBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (candidate.includes("/")) {
      if (spawnSync("test", ["-x", candidate]).status === 0) return candidate;
      continue;
    }
    if (spawnSync("which", [candidate]).status === 0) return candidate;
  }
  return null;
}

function parseArgs(argv) {
  const args = { base: "https://lmaa.space" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url" && argv[i + 1]) args.base = argv[++i].replace(/\/$/, "");
  }
  return args;
}

/**
 * Finds a shop detail URL from a category page.
 *
 * @param base - Site origin.
 * @returns A path such as `/shop/abc123`, or `null` when none is linked.
 *
 * @remarks
 * Discovered rather than hard-coded, because that page carries the Leaflet map,
 * which is the only client-only island on the site, and a fixed token would rot
 * as soon as the shop it names is removed.
 */
async function findShopPath(base) {
  for (const category of ["/category/computer", "/category/books", "/search"]) {
    try {
      const html = await (await fetch(`${base}${category}`)).text();
      const match = html.match(/\/shop\/[A-Za-z0-9_-]+/);
      if (match) return match[0];
    } catch {
      // Try the next category.
    }
  }
  return null;
}

async function main() {
  const { base } = parseArgs(process.argv.slice(2));
  const browser = resolveBrowser();

  if (!browser) {
    console.error(
      "CSP check failed: no Chrome or Chromium found. Set CHROME_PATH, or install google-chrome.",
    );
    process.exit(1);
  }

  const shopPath = await findShopPath(base);
  const routes = ["/", "/about", "/suggestion", "/search"];
  if (shopPath) {
    routes.push(shopPath);
  } else {
    console.error(
      "CSP check failed: no shop detail page found to test, and that is the only page with a client-only island.",
    );
    process.exit(1);
  }

  const profile = mkdtempSync(path.join(tmpdir(), "csp-check-"));
  const chrome = spawn(
    browser,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${VIEWPORT}`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  /**
   * Stops the browser and removes its profile.
   *
   * @remarks
   * Waits for the process to exit before deleting, because the browser keeps
   * writing to the profile until it is gone and the removal then fails with
   * `ENOTEMPTY`. A profile left behind in the temporary directory is not worth
   * failing a passing check over, so a removal that still does not succeed is
   * reported and swallowed.
   */
  const cleanup = async () => {
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve));
      chrome.kill("SIGKILL");
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
    }
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (err) {
      console.warn(`Could not remove the temporary browser profile ${profile}: ${err.message}`);
    }
  };

  try {
    await waitForBrowser();
    const failures = [];

    for (const route of routes) {
      const violations = await checkRoute(`${base}${route}`);
      if (violations.length > 0) failures.push({ route, violations });
      console.log(
        `${violations.length === 0 ? "ok  " : "FAIL"} ${route} — ${violations.length} CSP violation(s)`,
      );
      for (const violation of violations.slice(0, 5)) {
        console.log(`       ${violation}`);
      }
    }

    if (failures.length > 0) {
      console.error(
        `\nCSP check failed: ${failures.length} of ${routes.length} pages had content blocked by the policy.`,
      );
      process.exit(1);
    }

    console.log(`\nNo CSP violations across ${routes.length} pages.`);
  } finally {
    await cleanup();
  }
}

async function waitForBrowser() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("the browser did not expose a debugging endpoint");
}

/**
 * Opens one page and collects everything the policy refused.
 *
 * @param url - Absolute URL to load.
 * @returns One description per violation.
 *
 * @remarks
 * Listens for `securitypolicyviolation`, which the page fires for each blocked
 * resource and which names the directive and the blocked URI, rather than
 * scraping console text. The handler is installed before any document script
 * runs, so violations during initial parsing are caught too.
 */
async function checkRoute(url) {
  const target = await (
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })
  ).json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let messageId = 0;
  const send = (method, params = {}) =>
    ws.send(JSON.stringify({ id: ++messageId, method, params }));

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  send("Page.enable");
  send("Runtime.enable");
  send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__cspViolations.push(
          event.violatedDirective + ' blocked ' + (event.blockedURI || 'inline')
        );
      });
    `,
  });

  send("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, PAGE_SETTLE_MS));

  const evaluationId = ++messageId;
  ws.send(
    JSON.stringify({
      id: evaluationId,
      method: "Runtime.evaluate",
      params: {
        returnByValue: true,
        expression: "window.__cspViolations || []",
      },
    }),
  );

  const violations = await new Promise((resolve) => {
    const handler = (event) => {
      const message = JSON.parse(event.data);
      if (message.id === evaluationId) {
        ws.removeEventListener("message", handler);
        resolve(message.result?.result?.value ?? []);
      }
    };
    ws.addEventListener("message", handler);
    setTimeout(() => resolve([]), 5000);
  });

  ws.close();
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${target.id}`);

  // The same rule usually fires once per blocked element; report each once.
  return [...new Set(violations)];
}

await main();
