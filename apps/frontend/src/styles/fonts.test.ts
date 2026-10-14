import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";

import { describe, expect, it } from "vitest";

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));

function read(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

/**
 * WOFF2 table flags for the tables this file reads or has to recognize, from
 * the "Known Table Tags" list of the WOFF2 specification. A flag of 63 means
 * the tag follows as four bytes.
 */
const WOFF2_TABLE_FLAG = { hhea: 2, os2: 6, glyf: 10, loca: 11, arbitrary: 63 } as const;
const WOFF2_HEADER_LENGTH = 48;

/**
 * The `hhea` and `OS/2` tables of a WOFF2 file, cut out of its decompressed
 * table data.
 *
 * WOFF2 stores the tables one after the other in a single Brotli stream, in
 * the order of its table directory. A table takes its transformed length when
 * it was transformed and its original length otherwise. `glyf` and `loca`
 * count as untransformed at transform version 3, every other table at version
 * 0. Neither `hhea` nor `OS/2` is ever transformed, so both appear as they
 * stand in the font.
 *
 * @param file - The WOFF2 file's bytes; a font collection is not read.
 * @returns The two tables' bytes.
 */
function woff2MetricTables(file: Buffer): { hhea: Buffer; os2: Buffer } {
  const tableCount = file.readUInt16BE(12);
  const compressedLength = file.readUInt32BE(20);
  let cursor = WOFF2_HEADER_LENGTH;
  const readBase128 = (): number => {
    let value = 0;
    for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
      const byte = file[cursor++];
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error("a UIntBase128 value runs longer than five bytes");
  };
  const entries: Array<{ flag: number; length: number }> = [];
  for (let table = 0; table < tableCount; table++) {
    const flags = file[cursor++];
    const flag = flags & 0x3f;
    const transformVersion = flags >> 6;
    if (flag === WOFF2_TABLE_FLAG.arbitrary) cursor += 4;
    const originalLength = readBase128();
    const nullVersion = flag === WOFF2_TABLE_FLAG.glyf || flag === WOFF2_TABLE_FLAG.loca ? 3 : 0;
    const length = transformVersion === nullVersion ? originalLength : readBase128();
    entries.push({ flag, length });
  }
  const data = brotliDecompressSync(file.subarray(cursor, cursor + compressedLength));
  const tables = new Map<number, Buffer>();
  let offset = 0;
  for (const { flag, length } of entries) {
    tables.set(flag, data.subarray(offset, offset + length));
    offset += length;
  }
  const hhea = tables.get(WOFF2_TABLE_FLAG.hhea);
  const os2 = tables.get(WOFF2_TABLE_FLAG.os2);
  if (!hhea || !os2) throw new Error("the file has no hhea or no OS/2 table");
  return { hhea, os2 };
}

describe("website font delivery", () => {
  it("does not reference the retired public font path from frontend source files", () => {
    const sourceRoot = resolve(frontendRoot, "src");
    const sourceFiles = readdirSync(sourceRoot, { recursive: true }).filter(
      (path): path is string =>
        typeof path === "string" &&
        /\.(?:astro|css|ts|tsx)$/.test(path) &&
        !path.endsWith(".test.ts") &&
        !path.endsWith(".test.tsx"),
    );

    for (const sourceFile of sourceFiles) {
      const source = readFileSync(resolve(sourceRoot, sourceFile), "utf8");
      expect(source, sourceFile).not.toMatch(/(?:href=|url\()\s*["']?\/fonts\//);
    }
  });

  it("routes font declarations, binaries, and critical preloads through the Vite asset pipeline", () => {
    const fontStylesPath = resolve(frontendRoot, "src/assets/fonts/fonts.css");
    const globalStyles = read("src/styles/global.css");
    const layout = read("src/layouts/BaseLayout.astro");
    const tokens = read("../../packages/shared/styles/tokens.css");

    expect(existsSync(fontStylesPath)).toBe(true);
    expect(globalStyles).toContain('@import "../assets/fonts/fonts.css";');
    expect(layout).not.toContain('href="/fonts/fonts.css"');
    expect(layout).not.toMatch(/href="\/fonts\/[^"]+\.woff2"/);
    expect(layout).toContain("criticalFontPreloads.map");
    expect(tokens).toContain('--ds-font-sans: "Barlow", system-ui, -apple-system, sans-serif;');

    if (!existsSync(fontStylesPath)) return;

    const fontStyles = read("src/assets/fonts/fonts.css");
    // Every file in the folder is declared, and every declared file is in the
    // folder, so the folder is the one list of what the site ships.
    const expectedFontAssets = readdirSync(resolve(frontendRoot, "src/assets/fonts")).filter(
      (name) => name.endsWith(".woff2"),
    );
    const declaredFontAssets = [...fontStyles.matchAll(/url\("\.\/([\w-]+\.woff2)"\)/g)].map(
      (match) => match[1],
    );
    expect([...declaredFontAssets].sort()).toEqual([...expectedFontAssets].sort());
    expect(fontStyles).not.toMatch(/url\(["']?\/fonts\//);

    // A display face waits for its file rather than painting a fallback, and
    // the layout preloads only display cuts, so a preload always shortens a
    // wait the reader would otherwise see.
    const displayFaceBlocks = (fontStyles.match(/@font-face\s*{[^}]+}/g) ?? []).filter((block) =>
      /font-family: "Barlow Condensed"/.test(block),
    );
    for (const face of displayFaceBlocks) {
      expect(face).toContain("font-display: block;");
    }
    // The layout preloads what every page shows, and a page adds its own.
    const sourceRoot = resolve(frontendRoot, "src");
    const preloads = readdirSync(sourceRoot, { recursive: true })
      .filter((path): path is string => typeof path === "string" && path.endsWith(".astro"))
      .flatMap((path) => [
        ...readFileSync(resolve(sourceRoot, path), "utf8").matchAll(
          /@\/assets\/fonts\/([\w-]+\.woff2)\?url/g,
        ),
      ])
      .map((match) => match[1]);
    expect(preloads.length).toBeGreaterThan(0);
    for (const preload of preloads) {
      const face = displayFaceBlocks.find((block) => block.includes(`url("./${preload}")`));
      expect(face, preload).toBeDefined();
    }
  });

  it("puts the middle of the capitals in the middle of the line in every font file", () => {
    // scripts/center-font-metrics.py sets the ascender so that it exceeds the
    // descender by the cap height, in hhea and in the OS/2 typo values, which
    // is what keeps a label optically centered in its button. A font file
    // replaced without running it again fails here.
    const fontsRoot = resolve(frontendRoot, "src/assets/fonts");
    const fontFiles = readdirSync(fontsRoot).filter((name) => name.endsWith(".woff2"));
    expect(fontFiles.length).toBeGreaterThan(0);
    for (const name of fontFiles) {
      const { hhea, os2 } = woff2MetricTables(readFileSync(resolve(fontsRoot, name)));
      const ascender = hhea.readInt16BE(4);
      const descender = hhea.readInt16BE(6);
      const capHeight = os2.readInt16BE(88);
      expect(ascender + descender, name).toBe(capHeight);
      expect([os2.readInt16BE(68), os2.readInt16BE(70)], name).toEqual([ascender, descender]);
    }
  });
});
