#!/usr/bin/env node
/**
 * Writes the LMAA wordmark from the icon, and puts the icon file into the form
 * the site reads. Both live in the marks folder of `@lmaa/ui`,
 * `packages/ui/src/assets/marks/`.
 *
 * The icon, `lmaa-icon.svg`, is drawn by hand: a squircle tile with the
 * llama's head cut out of it. An editor writes it back in its own form, so the
 * generator reads the path that holds the tile, takes the subpath spanning the
 * whole drawing as the tile and the others as the head, and writes the file
 * again with the cut-out filled in `currentColor` and the head a second time
 * as a path of its own with the class `lmaa-icon-head`. A file it wrote comes
 * out unchanged.
 *
 * The wordmark sets the icon beside "LMAA" as Google Sans Flex draws it.
 *
 * Run `npm run brand:marks` after changing the icon or anything here, and
 * commit the drawings it writes. `build-brand-marks.test.mjs` fails while they
 * differ.
 */
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// "LMAA" as Google Sans Flex 5.000 sets it at wght 559, wdth 125, ROND 100
// and opsz 144: shaped by HarfBuzz, drawn with fontTools, and its quadratic
// curves turned into cubic ones. The font is
// GoogleSansFlex[ROND,opsz,slnt,wdth,wght].ttf from google/fonts at commit
// bd8f81dd. The units put the H's cap height at LETTERS_CAP_HEIGHT and the
// baseline at 0, and y points down, as written.
const LETTERS =
  "M20.503 0C17.416 0 14.763 -1.048 12.542 -3.143C10.322 -5.238 9.211 -7.745 9.211 -10.663L9.211 -90.176C9.211 -92.857 10.229 -95.168 12.265 -97.108C14.301 -99.048 16.731 -100.018 19.556 -100.018L19.556 -100.018C22.381 -100.018 24.812 -99.048 26.848 -97.108C28.884 -95.168 29.901 -92.857 29.901 -90.176L29.901 -17.357L85.442 -17.357C87.859 -17.357 89.928 -16.502 91.647 -14.792C93.367 -13.082 94.226 -11.044 94.226 -8.679L94.226 -8.679C94.226 -6.313 93.365 -4.276 91.643 -2.565C89.92 -0.855 87.853 0 85.442 0ZM114.654 1.072C111.961 1.072 109.644 0.144 107.702 -1.711C105.759 -3.567 104.788 -5.787 104.788 -8.37L104.798 -85.966C104.798 -89.957 106.237 -93.36 109.116 -96.175C111.995 -98.989 115.493 -100.397 119.611 -100.397L119.611 -100.397C122.281 -100.397 124.707 -99.717 126.891 -98.357C129.075 -96.997 130.765 -95.376 131.96 -93.494L177.127 -23.48L177.127 -23.48L177.132 -23.48L177.132 -23.48L222.691 -93.706C223.797 -95.489 225.401 -97.033 227.501 -98.34C229.601 -99.646 231.92 -100.299 234.459 -100.299L234.459 -100.299C238.386 -100.299 241.711 -98.963 244.435 -96.291C247.159 -93.619 248.521 -90.375 248.521 -86.557L248.521 -8.299C248.521 -5.73 247.558 -3.526 245.632 -1.687C243.707 0.152 241.397 1.071 238.702 1.071L238.702 1.071C236.024 1.071 233.722 0.152 231.796 -1.687C229.87 -3.526 228.908 -5.73 228.908 -8.299L228.908 -63.408L228.908 -72.266L228.908 -72.266L228.908 -72.266L186.059 -4.484C185.099 -2.934 183.798 -1.656 182.155 -0.65C180.512 0.356 178.648 0.859 176.564 0.859L176.564 0.859C174.49 0.859 172.631 0.356 170.988 -0.65C169.345 -1.656 168.044 -2.934 167.084 -4.484L124.546 -71.753L124.546 -71.753L124.545 -71.753L124.545 -63.02L124.545 -8.37C124.545 -5.787 123.573 -3.567 121.631 -1.711C119.689 0.144 117.363 1.072 114.654 1.072ZM271.139 1.026C267.501 1.026 264.864 -0.541 263.229 -3.676C261.595 -6.81 261.93 -10 264.235 -13.246L312.657 -93.519C313.95 -95.491 315.582 -97.088 317.553 -98.31C319.525 -99.533 321.796 -100.144 324.367 -100.144L324.367 -100.144C326.914 -100.144 329.157 -99.533 331.095 -98.31C333.033 -97.088 334.648 -95.491 335.94 -93.519L384.134 -13.724C386.572 -10.276 386.964 -6.953 385.309 -3.754C383.655 -0.555 380.966 1.045 377.241 1.045L377.241 1.045C375.41 1.045 373.757 0.603 372.282 -0.282C370.806 -1.167 369.644 -2.315 368.794 -3.728L326.088 -74.674L324.157 -77.018L324.15 -77.018L322.177 -74.683L279.308 -3.633C278.543 -2.399 277.421 -1.314 275.943 -0.378C274.464 0.558 272.862 1.026 271.139 1.026ZM282.317 -22.953L288.928 -36.595L359.696 -36.595L366.435 -22.953ZM404.214 1.026C400.576 1.026 397.94 -0.541 396.305 -3.676C394.67 -6.81 395.005 -10 397.311 -13.246L445.733 -93.519C447.025 -95.491 448.657 -97.088 450.629 -98.31C452.601 -99.533 454.872 -100.144 457.442 -100.144L457.442 -100.144C459.99 -100.144 462.232 -99.533 464.17 -98.31C466.108 -97.088 467.723 -95.491 469.016 -93.519L517.21 -13.724C519.647 -10.276 520.039 -6.953 518.385 -3.754C516.731 -0.555 514.041 1.045 510.317 1.045L510.317 1.045C508.486 1.045 506.833 0.603 505.357 -0.282C503.882 -1.167 502.719 -2.315 501.869 -3.728L459.164 -74.674L457.232 -77.018L457.226 -77.018L455.253 -74.683L412.384 -3.633C411.619 -2.399 410.497 -1.314 409.018 -0.378C407.539 0.558 405.938 1.026 404.214 1.026ZM415.393 -22.953L422.004 -36.595L492.772 -36.595L499.51 -22.953Z";
const LETTERS_CAP_HEIGHT = 100;
// The icon beside the letters, in their units: its height, and its distance
// from the L's ink.
const WORDMARK_ICON_SIZE = 150;
const WORDMARK_GAP = 45;
// A subpath of the icon whose box comes this close to every edge of the
// drawing is the tile. An editor writes the tile's edge to three decimals.
const TILE_TOLERANCE = 0.5;

/**
 * Writes a number with at most three decimals and without trailing zeros.
 *
 * @param {number} value Coordinate or length.
 * @returns {string} The number as it appears in path data.
 */
export function formatNumber(value) {
  const text = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return text === "-0" ? "0" : text;
}

/**
 * A point on a cubic Bézier curve.
 *
 * @param {Array} curve Start, first handle, second handle and end.
 * @param {number} along The curve's parameter, 0 at the start and 1 at the end.
 * @returns {[number, number]}
 */
export function bezierPoint([start, first, second, end], along) {
  const rest = 1 - along;
  return [0, 1].map(
    (axis) =>
      rest ** 3 * start[axis] +
      3 * rest * rest * along * first[axis] +
      3 * rest * along * along * second[axis] +
      along ** 3 * end[axis],
  );
}

function distance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

const COMMAND = /[MLAHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/g;
const ARGUMENT_COUNT = { M: 2, L: 2, H: 1, V: 1, A: 7, C: 6, Z: 0 };

/**
 * Splits path data into drawn segments, each with the direction it leaves and arrives in.
 *
 * Understands the absolute M, L, H, V, A, C and Z that this generator, the
 * font tools and the editor the icon is drawn in write, separated by spaces or
 * commas. Any other command fails, because reading past it would misplace
 * every point after it. An arc is taken as the small arc of a circle.
 *
 * @param {string} path SVG path data.
 * @returns {Array<Array<{ kind: string, start: number[], end: number[], leaving: number[], arriving: number[], center?: number[], radius?: number, sweep?: number }>>}
 *   The segments of each contour.
 */
export function pathContours(path) {
  const unknown = (path.match(/[A-Za-z]/g) ?? []).filter(
    (letter) => letter !== "e" && !(letter in ARGUMENT_COUNT),
  );
  if (unknown.length > 0) {
    throw new Error(
      `path data uses ${[...new Set(unknown)].join(", ")}; only the absolute commands M, L, H, V, A, C and Z are read`,
    );
  }
  const tokens = path.match(COMMAND);
  const contours = [];
  let contour = [];
  let current = null;
  let start = null;
  const unit = ([x, y]) => {
    const length = Math.hypot(x, y);
    return [x / length, y / length];
  };
  const line = (end) => {
    if (distance(current, end) > 1e-9) {
      const direction = unit([end[0] - current[0], end[1] - current[1]]);
      contour.push({ kind: "L", start: current, end, leaving: direction, arriving: direction });
    }
    current = end;
  };
  for (let index = 0; index < tokens.length;) {
    const letter = tokens[index++];
    const values = tokens.slice(index, index + ARGUMENT_COUNT[letter]).map(Number);
    index += ARGUMENT_COUNT[letter];
    if (letter === "M") {
      current = start = values;
    } else if (letter === "L") {
      line(values);
    } else if (letter === "H") {
      line([values[0], current[1]]);
    } else if (letter === "V") {
      line([current[0], values[0]]);
    } else if (letter === "A") {
      const [radius, , , , sweep, x, y] = values;
      const end = [x, y];
      const middle = [(current[0] + end[0]) / 2, (current[1] + end[1]) / 2];
      const half = distance(current, end) / 2;
      const depth = Math.sqrt(Math.max(radius * radius - half * half, 0));
      const chord = unit([end[0] - current[0], end[1] - current[1]]);
      // SVG puts the center on the left of the chord when the large-arc and
      // sweep flags differ, and every arc here takes the small arc.
      const side = sweep ? 1 : -1;
      const center = [middle[0] - chord[1] * depth * side, middle[1] + chord[0] * depth * side];
      const turn = sweep ? 1 : -1;
      const tangent = ([px, py]) => unit([-(py - center[1]) * turn, (px - center[0]) * turn]);
      contour.push({
        kind: "A",
        start: current,
        end,
        leaving: tangent(current),
        arriving: tangent(end),
        center,
        radius,
        sweep,
      });
      current = end;
    } else if (letter === "C") {
      const first = [values[0], values[1]];
      const second = [values[2], values[3]];
      const end = [values[4], values[5]];
      contour.push({
        kind: "C",
        start: current,
        end,
        first,
        second,
        leaving: unit([first[0] - current[0], first[1] - current[1]]),
        arriving: unit([end[0] - second[0], end[1] - second[1]]),
      });
      current = end;
    } else if (letter === "Z") {
      line(start);
      contours.push(contour);
      contour = [];
    }
  }
  return contours;
}

/**
 * The box around a path, sampled along its arcs and curves.
 *
 * @param {string} path SVG path data as `pathContours` reads it.
 * @returns {[number, number, number, number]} x, y, width and height.
 */
export function pathBounds(path) {
  const points = [];
  for (const contour of pathContours(path)) {
    for (const segment of contour) {
      points.push(segment.start, segment.end);
      if (segment.kind === "A") {
        const from = Math.atan2(
          segment.start[1] - segment.center[1],
          segment.start[0] - segment.center[0],
        );
        let sweep =
          Math.atan2(segment.end[1] - segment.center[1], segment.end[0] - segment.center[0]) - from;
        if (segment.sweep && sweep < 0) sweep += 2 * Math.PI;
        if (!segment.sweep && sweep > 0) sweep -= 2 * Math.PI;
        for (let step = 1; step < 64; step++) {
          const angle = from + (sweep * step) / 64;
          points.push([
            segment.center[0] + segment.radius * Math.cos(angle),
            segment.center[1] + segment.radius * Math.sin(angle),
          ]);
        }
      } else if (segment.kind === "C") {
        const curve = [segment.start, segment.first, segment.second, segment.end];
        for (let step = 1; step < 64; step++) {
          points.push(bezierPoint(curve, step / 64));
        }
      }
    }
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
}

/**
 * Reads the icon as an editor or this generator wrote it.
 *
 * The drawing is square and starts at 0 0. Of its paths, the one with a
 * subpath that spans the whole drawing holds the icon: that subpath is the
 * tile, and the others are the head cut out of it. Every other path, such as
 * a second copy of the head, is left out, so the head always comes from the
 * shape that is seen.
 *
 * @param {string} source The SVG file's text.
 * @returns {{ size: number, tile: string, head: string }} The drawing's side
 *   length, and the path data of the tile and of the head.
 */
export function readIcon(source) {
  const viewBox = source
    .match(/viewBox="([^"]+)"/)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!viewBox || viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== viewBox[3]) {
    throw new Error("the icon needs a square viewBox that starts at 0 0");
  }
  const size = viewBox[2];
  const spansDrawing = (subpath) =>
    pathBounds(subpath).every(
      (value, index) => Math.abs(value - [0, 0, size, size][index]) <= TILE_TOLERANCE,
    );
  for (const [, data] of source.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)) {
    const subpaths = data.match(/M[^M]*/g)?.map((subpath) => subpath.trim()) ?? [];
    const tileIndex = subpaths.findIndex(spansDrawing);
    if (tileIndex >= 0) {
      return {
        size,
        tile: subpaths[tileIndex],
        head: subpaths.filter((subpath, index) => index !== tileIndex).join(""),
      };
    }
  }
  throw new Error("the icon has no path with a subpath that spans the whole drawing");
}

/**
 * The icon as a complete SVG file in the form the site reads.
 *
 * The tile with the head cut out of it fills with `currentColor`. The head is
 * there a second time as a path of its own with the class `lmaa-icon-head`
 * and no fill, so a place that wants the head in a color of its own can fill
 * it, as the website's header and the favicon do.
 *
 * @param {{ size: number, tile: string, head: string }} icon The icon as `readIcon` returns it.
 * @returns {string}
 */
function iconSvg({ size, tile, head }) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
    `<path fill="currentColor" fill-rule="evenodd" d="${tile}${head}"/>` +
    `<path class="lmaa-icon-head" fill="none" d="${head}"/></svg>\n`
  );
}

/**
 * The wordmark as a complete SVG file: the icon on the left and "LMAA" on its
 * right.
 *
 * The icon stands WORDMARK_ICON_SIZE high, centered on the letters' cap
 * height, and WORDMARK_GAP from the L's ink. Its head stays cut out, so the
 * ground shows through it. The box is the ink's own, without a margin, so a
 * place that shows the wordmark decides the space around it.
 *
 * @param {{ size: number, tile: string, head: string }} icon The icon as `readIcon` returns it.
 * @returns {string}
 */
function wordmarkSvg({ size, tile, head }) {
  const [lettersX, lettersY, lettersWidth, lettersHeight] = pathBounds(LETTERS);
  // The tile spans the whole icon, so the icon's box is the square it is drawn in.
  const iconX = lettersX - WORDMARK_GAP - WORDMARK_ICON_SIZE;
  const iconY = -(LETTERS_CAP_HEIGHT + WORDMARK_ICON_SIZE) / 2;
  const top = Math.min(iconY, lettersY);
  const bottom = Math.max(iconY + WORDMARK_ICON_SIZE, lettersY + lettersHeight);
  const viewBox = [iconX, top, lettersX + lettersWidth - iconX, bottom - top]
    .map(formatNumber)
    .join(" ");
  // The scale is written in full, because three decimals would shrink the
  // icon by a hundredth of a percent.
  const iconPlacement = `translate(${formatNumber(iconX)} ${formatNumber(iconY)}) scale(${WORDMARK_ICON_SIZE / size})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<path fill="currentColor" fill-rule="evenodd" transform="${iconPlacement}" d="${tile}${head}"/>` +
    `<path fill="currentColor" d="${LETTERS}"/></svg>\n`
  );
}

/**
 * Both drawings as complete SVG files, from the icon file's text.
 *
 * @param {string} iconSource The icon file as an editor or this generator wrote it.
 * @returns {{ wordmark: string, icon: string }}
 */
export function buildMarks(iconSource) {
  const icon = readIcon(iconSource);
  return { wordmark: wordmarkSvg(icon), icon: iconSvg(icon) };
}

/**
 * Where the drawings live, relative to this file: the marks folder of
 * `@lmaa/ui`, which the website, the dashboard, the API reference and
 * `render-brand-images.mjs` all read, so each drawing exists once.
 */
export const MARK_FILES = {
  wordmark: new URL("../packages/ui/src/assets/marks/lmaa-wordmark.svg", import.meta.url),
  icon: new URL("../packages/ui/src/assets/marks/lmaa-icon.svg", import.meta.url),
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const marks = buildMarks(await readFile(MARK_FILES.icon, "utf8"));
  await writeFile(MARK_FILES.icon, marks.icon);
  await writeFile(MARK_FILES.wordmark, marks.wordmark);
  console.log("marks written: packages/ui/src/assets/marks/lmaa-icon.svg and lmaa-wordmark.svg");
}
