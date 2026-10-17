import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { MARK_FILES, buildMarks, pathContours, readIcon } from "./build-brand-marks.mjs";

// A square tile and a smaller square cut out of it, as path data an editor writes.
const TILE = "M0,0L10,0L10,10L0,10Z";
const HEAD = "M2,2L8,2L8,8L2,8Z";

test("the committed drawings are what the generator writes", async () => {
  const marks = buildMarks(await readFile(MARK_FILES.icon, "utf8"));
  assert.equal(await readFile(MARK_FILES.icon, "utf8"), marks.icon, "run npm run brand:marks");
  assert.equal(
    await readFile(MARK_FILES.wordmark, "utf8"),
    marks.wordmark,
    "run npm run brand:marks",
  );
});

test("an editor's export of the icon is put into the form the site reads", () => {
  // No fill, editor attributes, and a second head that differs from the one seen.
  const exported =
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
    '<svg width="100%" height="100%" viewBox="0 0 10 10" version="1.1" style="fill-rule:evenodd;">' +
    `<path d="${TILE}${HEAD}"/>` +
    '<path d="M2,2L7,2L7,7L2,7Z" style="fill:none;fill-rule:nonzero;"/></svg>';
  assert.equal(
    buildMarks(exported).icon,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      `<path fill="currentColor" fill-rule="evenodd" d="${TILE}${HEAD}"/>` +
      `<path class="lmaa-icon-head" fill="none" d="${HEAD}"/></svg>\n`,
  );
});

test("an icon the generator wrote comes out unchanged", () => {
  const { icon } = buildMarks(`<svg viewBox="0 0 10 10"><path d="${TILE}${HEAD}"/></svg>`);
  assert.equal(buildMarks(icon).icon, icon);
});

test("the tile is found wherever it stands in the path", () => {
  assert.deepEqual(readIcon(`<svg viewBox="0 0 10 10"><path d="${HEAD}${TILE}"/></svg>`), {
    size: 10,
    tile: TILE,
    head: HEAD,
  });
});

test("an icon without a tile is refused", () => {
  assert.throws(
    () => readIcon(`<svg viewBox="0 0 10 10"><path d="${HEAD}"/></svg>`),
    /spans the whole drawing/,
  );
});

test("path data with a command the reader does not know is refused", () => {
  assert.throws(() => pathContours("M0 0l10 0L10 10Z"), /uses l;/);
});
