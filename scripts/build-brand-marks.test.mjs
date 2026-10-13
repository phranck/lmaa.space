import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  MARK_FILES,
  buildMarks,
  iconPaths,
  pathContours,
  wordmarkPath,
} from "./build-brand-marks.mjs";

// An arc and the edge beside it may differ by no more than the three decimals
// the path is written with allow for.
const TANGENT_TOLERANCE_DEGREES = 0.01;

/**
 * Lists every joint where an arc meets its neighbor at an angle.
 *
 * @param {string} path SVG path data.
 * @returns {string[]} One line per joint that kinks.
 */
function kinkedArcJoints(path) {
  const kinks = [];
  for (const contour of pathContours(path)) {
    contour.forEach((segment, index) => {
      const following = contour[(index + 1) % contour.length];
      if (segment.kind !== "A" && following.kind !== "A") {
        return;
      }
      const dot =
        segment.arriving[0] * following.leaving[0] + segment.arriving[1] * following.leaving[1];
      const angle = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
      if (angle > TANGENT_TOLERANCE_DEGREES) {
        kinks.push(
          `${segment.kind}${following.kind} at ${segment.end.join(" ")}: ${angle.toFixed(3)} degrees`,
        );
      }
    });
  }
  return kinks;
}

test("the committed drawings are what the generator writes", async () => {
  const marks = buildMarks();
  assert.equal(
    await readFile(MARK_FILES.wordmark, "utf8"),
    marks.wordmark,
    "run npm run brand:marks",
  );
  assert.equal(await readFile(MARK_FILES.icon, "utf8"), marks.icon, "run npm run brand:marks");
});

test("every arc of the wordmark meets its edges without a kink", () => {
  assert.deepEqual(kinkedArcJoints(wordmarkPath()), []);
});

test("every arc of the icon meets its edges without a kink", () => {
  const { tile, letter } = iconPaths();
  assert.deepEqual(kinkedArcJoints(letter), []);
  assert.deepEqual(kinkedArcJoints(tile), []);
});

test("the wordmark is one outline with no hole", () => {
  assert.equal(pathContours(wordmarkPath()).length, 1);
});

test("a kinked join is reported", () => {
  // A quarter circle that leaves its edge at a right angle.
  assert.equal(kinkedArcJoints("M0 0L10 0A5 5 0 0 0 15 5L0 5Z").length > 0, true);
});
