import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  ICON_SQUIRCLE_EXPONENT,
  ICON_TILE,
  MARK_FILES,
  bezierPoint,
  buildMarks,
  iconPaths,
  pathContours,
  wordmarkPath,
} from "./build-brand-marks.mjs";

// The joints are checked on the construction, written at full precision. The
// committed drawings round to three decimals, and on the wordmark's ear tips,
// arcs of a radius of 1.5 turning through about 148 degrees, that alone tilts
// the tangent by up to a tenth of a degree, more than a real kink may.
const TANGENT_TOLERANCE_DEGREES = 0.01;
const FULL_PRECISION = String;
// The tile's curves may stray from the true superellipse by a twentieth of a
// unit, which is a twentieth of a pixel where the tile is shown at its own
// size. They are sampled this many times each.
const SQUIRCLE_TOLERANCE = 0.05;
const SQUIRCLE_SAMPLES = 200;

/** Joints beside an arc, which are all smooth; elsewhere a joint may be a corner on purpose. */
const besideArc = (segment, following) => segment.kind === "A" || following.kind === "A";
const everyJoint = () => true;

/**
 * Lists every joint where a segment meets the next at an angle.
 *
 * @param {string} path SVG path data.
 * @param {(segment: object, following: object) => boolean} [checked] Which
 *   joints have to be smooth, by the two segments that meet there.
 * @returns {string[]} One line per joint that kinks.
 */
function kinkedJoints(path, checked = besideArc) {
  const kinks = [];
  for (const contour of pathContours(path)) {
    contour.forEach((segment, index) => {
      const following = contour[(index + 1) % contour.length];
      if (!checked(segment, following)) {
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

/**
 * How far a tile outline strays from the superellipse at worst, measured from
 * the tile's center along the line through each sampled point.
 *
 * @param {string} path SVG path data made of cubic curves.
 * @returns {number} The largest distance, in units of the tile.
 */
function squircleDeviation(path) {
  const half = ICON_TILE / 2;
  const exponent = ICON_SQUIRCLE_EXPONENT;
  let worst = 0;
  for (const segment of pathContours(path).flat()) {
    const curve = [segment.start, segment.first, segment.second, segment.end];
    for (let step = 0; step <= SQUIRCLE_SAMPLES; step++) {
      const [horizontal, vertical] = bezierPoint(curve, step / SQUIRCLE_SAMPLES);
      const offset = [horizontal - half, vertical - half];
      const reach =
        (Math.abs(offset[0] / half) ** exponent + Math.abs(offset[1] / half) ** exponent) **
        (1 / exponent);
      worst = Math.max(worst, (Math.abs(reach - 1) * Math.hypot(...offset)) / reach);
    }
  }
  return worst;
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
  assert.deepEqual(kinkedJoints(wordmarkPath(FULL_PRECISION)), []);
});

test("every arc of the icon's head meets its edges without a kink", () => {
  assert.deepEqual(kinkedJoints(iconPaths(FULL_PRECISION).head), []);
});

test("the icon's tile is a squircle of curves that meet without a kink", () => {
  const { tile } = iconPaths(FULL_PRECISION);
  const contours = pathContours(tile);
  assert.equal(contours.length, 1);
  assert.deepEqual(
    contours[0].filter((segment) => segment.kind !== "C").map((segment) => segment.kind),
    [],
  );
  assert.deepEqual(kinkedJoints(tile, everyJoint), []);
  const deviation = squircleDeviation(tile);
  assert.ok(deviation <= SQUIRCLE_TOLERANCE, `strays by ${deviation}`);
});

test("the wordmark is one outline with no hole", () => {
  assert.equal(pathContours(wordmarkPath()).length, 1);
});

test("a kinked join is reported", () => {
  // A quarter circle that leaves its edge at a right angle.
  assert.equal(kinkedJoints("M0 0L10 0A5 5 0 0 0 15 5L0 5Z").length > 0, true);
});

test("a tile that strays from the squircle is reported", () => {
  // A circle across the tile, drawn with four curves.
  const circle =
    "M512 256C512 397.4 397.4 512 256 512C114.6 512 0 397.4 0 256" +
    "C0 114.6 114.6 0 256 0C397.4 0 512 114.6 512 256Z";
  assert.ok(squircleDeviation(circle) > SQUIRCLE_TOLERANCE);
});
