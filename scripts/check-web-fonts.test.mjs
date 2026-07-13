import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

const temporaryDirectories = [];
const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function loadVerifier() {
  try {
    return await import("./check-web-fonts.mjs");
  } catch (error) {
    assert.fail(`Web-font verifier implementation is missing: ${String(error)}`);
  }
}

function hashedFontName(fontFile) {
  return fontFile.replace(/\.woff2$/, ".AbCd1234.woff2");
}

function fontCss(fontFiles, prefix = "/_astro/") {
  return fontFiles
    .map(
      (fontFile) =>
        `@font-face{font-family:"Test";src:url("${prefix}${hashedFontName(fontFile)}") format("woff2")}`,
    )
    .join("\n");
}

test("accepts a build whose CSS references every content-hashed font asset", async () => {
  const verifier = await loadVerifier();
  const clientDirectory = await mkdtemp(join(tmpdir(), "lmaa-font-build-"));
  temporaryDirectories.push(clientDirectory);
  const assetDirectory = join(clientDirectory, "_astro");
  await mkdir(assetDirectory);

  await Promise.all(
    verifier.EXPECTED_FONT_FILES.map((fontFile) =>
      writeFile(join(assetDirectory, hashedFontName(fontFile)), "font"),
    ),
  );
  await writeFile(
    join(assetDirectory, "style.AbCd1234.css"),
    fontCss(verifier.EXPECTED_FONT_FILES),
  );

  const result = await verifier.verifyBuiltFonts(clientDirectory);

  assert.equal(result.fontCount, verifier.EXPECTED_FONT_FILES.length);
  assert.equal(result.stylesheetCount, 1);
});

test("rejects a build that still references an unversioned public font URL", async () => {
  const verifier = await loadVerifier();
  const clientDirectory = await mkdtemp(join(tmpdir(), "lmaa-font-build-"));
  temporaryDirectories.push(clientDirectory);
  const assetDirectory = join(clientDirectory, "_astro");
  await mkdir(assetDirectory);
  await writeFile(
    join(assetDirectory, "style.AbCd1234.css"),
    '@font-face{font-family:"Test";src:url("/fonts/barlow-condensed-400.woff2")}',
  );

  await assert.rejects(
    verifier.verifyBuiltFonts(clientDirectory),
    /unversioned \/fonts\/ font URL/,
  );
});

test("accepts deployed hashed font preloads with immutable WOFF2 responses", async () => {
  const verifier = await loadVerifier();
  const stylesheetPath = "/_astro/style.AbCd1234.css";
  const criticalFonts = new Set(verifier.CRITICAL_FONT_FILES);
  const css = fontCss(verifier.EXPECTED_FONT_FILES);
  const html = [
    "<!doctype html><html><head>",
    `<link rel="stylesheet" href="${stylesheetPath}">`,
    ...verifier.CRITICAL_FONT_FILES.map(
      (fontFile) =>
        `<link rel="preload" as="font" type="font/woff2" crossorigin href="/_astro/${hashedFontName(fontFile)}">`,
    ),
    "</head><body></body></html>",
  ].join("");

  const server = createServer((request, response) => {
    if (request.url === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }
    if (request.url === stylesheetPath) {
      response.writeHead(200, {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": "text/css; charset=utf-8",
      });
      response.end(css);
      return;
    }
    const requestedFont = verifier.EXPECTED_FONT_FILES.find(
      (fontFile) => request.url === `/_astro/${hashedFontName(fontFile)}`,
    );
    if (requestedFont && criticalFonts.has(requestedFont)) {
      response.writeHead(200, {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": "font/woff2",
      });
      response.end(request.method === "HEAD" ? undefined : "font");
      return;
    }
    response.writeHead(404);
    response.end();
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const result = await verifier.verifyRemoteFonts(`http://127.0.0.1:${address.port}`);

  assert.equal(result.fontCount, verifier.EXPECTED_FONT_FILES.length);
  assert.equal(result.preloadCount, verifier.CRITICAL_FONT_FILES.length);
});

test("runs font verification in local and deployed smoke checks", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const productionSmoke = await readFile(new URL("./smoke-prod.sh", import.meta.url), "utf8");

  assert.match(
    packageJson.scripts["ci:smoke"],
    /check-web-fonts\.mjs --dist apps\/frontend\/dist\/client/,
  );
  assert.match(productionSmoke, /check-web-fonts\.mjs --url "\$WEB_BASE_URL"/);
});
