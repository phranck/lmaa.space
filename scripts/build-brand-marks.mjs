#!/usr/bin/env node
/**
 * Constructs the LMAA icon and wordmark and writes them to the marks folder of
 * `@lmaa/ui`, `packages/ui/src/assets/marks/`.
 *
 * The icon is the llama's head on a stub of neck, cut out of a squircle. The
 * head is the drawing from the Bodoni Moda wordmark, made of Bézier curves
 * because it is a drawing rather than geometry. The tips of its ears and the
 * corners of the neck's cut are circular arcs that touch the curves and edges
 * on both sides, so nothing meets an arc at an angle.
 *
 * The wordmark sets the icon beside "LMAA" as Google Sans Flex draws it.
 *
 * Construction runs with y pointing up; the SVG output turns it over.
 *
 * Run `npm run brand:marks` after changing anything here, and commit the
 * drawings it writes. `build-brand-marks.test.mjs` fails while they differ.
 */
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// The llama's head as drawn for the Bodoni wordmark, where its neck spans x
// 69.69 to 90.37 and y points down. The curves run from the back of the neck
// over the ears and the snout to the throat. The first handle of the first
// curve stands straight above the back of the neck, so the head leaves the
// neck without a kink.
const BODONI_NECK = [69.69, 90.37];
const HEAD = [
  [
    [90.37, 73.66],
    [90.37, 70.81],
    [88.7, 68.55],
    [86.89, 66.81],
  ],
  [
    [86.89, 66.81],
    [85.44, 53.67],
    [85.28, 47.53],
    [81.35, 35.73],
  ],
  [
    [81.35, 35.73],
    [81.08, 36.65],
    [80.82, 37.52],
    [80.57, 38.36],
  ],
  [
    [80.57, 38.36],
    [79.13, 43.26],
    [78.04, 46.95],
    [77.38, 50.28],
  ],
  [
    [77.38, 50.28],
    [78.373, 54.593],
    [79.183, 58.84],
    [79.81, 63.02],
  ],
  [
    [79.81, 63.02],
    [79.26, 62.87],
    [78.7, 62.74],
    [78.12, 62.62],
  ],
  [
    [78.12, 62.62],
    [76.5, 51.46],
    [74.2, 43.19],
    [70.69, 32.66],
  ],
  [
    [70.69, 32.66],
    [66.92, 45.5],
    [66.87, 52.62],
    [68.63, 62.38],
  ],
  [
    [68.63, 62.38],
    [66.93, 62.59],
    [65.27, 62.94],
    [63.72, 63.41],
  ],
  [
    [63.72, 63.41],
    [55.11, 66.07],
    [49.37, 70.99],
    [41.17, 73.04],
  ],
  [
    [41.17, 73.04],
    [37.48, 73.86],
    [34, 75.09],
    [32.97, 79.6],
  ],
  [
    [32.97, 79.6],
    [31.74, 84.93],
    [34.2, 90.67],
    [40.76, 91.08],
  ],
  [
    [40.76, 91.08],
    [52.32, 91.89],
    [63.5, 91.5],
    [69.69, 95.07],
  ],
];

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

const TOLERANCE = 1e-6;
// Joints of the head drawing that turn by less than this many degrees are
// meant to be smooth and are made so; larger ones are corners on purpose.
const SMOOTH_LIMIT_DEGREES = 5;
// The curves of HEAD with these indices end in the tips of the back ear and
// the front ear. Each tip is rounded with a circle of EAR_TIP_RADIUS, in the
// units of the head drawing.
const EAR_TIP_JOINTS = [1, 6];
const EAR_TIP_RADIUS = 1.5;
// The search for where a round touches its curves stops once the two centers
// it compares lie this close, and gives up after this many steps. It measures
// its slope by moving each place this far along its curves.
const ROUNDING_TOLERANCE = 1e-12;
const ROUNDING_STEPS = 50;
const ROUNDING_NUDGE = 1e-7;

// The icon: a 512 tile shaped as a squircle, and the head on a stub of neck
// standing the margin away from the tile's edge on its taller side.
export const ICON_TILE = 512;
// The squircle is the superellipse |x|^4 + |y|^4 = 1, the classic one,
// stretched over the tile. Each eighth of it, from the middle of a side to the
// diagonal, is written as ICON_SQUIRCLE_CURVES cubic curves.
export const ICON_SQUIRCLE_EXPONENT = 4;
const ICON_SQUIRCLE_CURVES = 6;
const ICON_MARGIN = 32;
// How far the neck runs on below the throat, as a share of its width, and the
// radius of the two corners of its straight cut, as a share as well.
const ICON_NECK_SHARE = 0.6;
const ICON_NECK_CORNER_SHARE = 0.2;
// How much further in the back of the neck stands at the cut than below the
// head, as a share of the neck's width, so that it runs out of the back of the
// head in one outward curve. The curve's control point stands
// ICON_NECK_BEND_SHARE of the way from the head down to the cut; the further
// down, the more the curve bulges.
const ICON_NECK_TAPER_SHARE = 0.35;
const ICON_NECK_BEND_SHARE = 0.5;
// The outline turns left at every rounded corner with y up. Turned over for
// SVG, that is the direction its sweep flag 0 draws.
const SWEEP_CONVEX = 0;

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

/** An edge the outline runs along, with the direction the outline takes on it. */
class Line {
  /**
   * @param {[number, number]} point Any point on the edge.
   * @param {[number, number]} direction The direction of travel, any length.
   */
  constructor(point, direction) {
    const length = Math.hypot(direction[0], direction[1]);
    this.point = point;
    this.direction = [direction[0] / length, direction[1] / length];
  }

  /**
   * @param {[number, number]} start First point.
   * @param {[number, number]} end Second point, travelled towards.
   * @returns {Line} The edge through both points.
   */
  static through(start, end) {
    return new Line(start, [end[0] - start[0], end[1] - start[1]]);
  }
}

/**
 * @param {Line} first
 * @param {Line} second
 * @returns {[number, number]} Where the two edges, extended, cross.
 */
function intersect(first, second) {
  const [px, py] = first.point;
  const [dx, dy] = first.direction;
  const [qx, qy] = second.point;
  const [ex, ey] = second.direction;
  const denominator = dx * ey - dy * ex;
  if (Math.abs(denominator) < TOLERANCE) {
    throw new Error("parallel edges have no corner");
  }
  const along = ((qx - px) * ey - (qy - py) * ex) / denominator;
  return [px + along * dx, py + along * dy];
}

function distance(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

/**
 * The angle the outline turns through from one edge to the next, left positive.
 *
 * @param {Line} first
 * @param {Line} second
 * @returns {number} Radians.
 */
function turnBetween(first, second) {
  const [ax, ay] = first.direction;
  const [bx, by] = second.direction;
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

/**
 * Where a circular arc rounds the corner between two edges, touching both.
 *
 * @param {Line} first The edge the outline arrives on.
 * @param {Line} second The edge it leaves on.
 * @param {number} radius The arc's radius.
 * @returns {{ arrive: [number, number], leave: [number, number] }} Where the
 *   arc touches the first edge and the second.
 */
function roundedCorner(first, second, radius) {
  const corner = intersect(first, second);
  const turn = turnBetween(first, second);
  if (turn <= 0) {
    throw new Error("a corner that turns right cannot take a radius");
  }
  const reach = radius * Math.tan(turn / 2);
  const [arrivingX, arrivingY] = first.direction;
  const [leavingX, leavingY] = second.direction;
  return {
    arrive: [corner[0] - arrivingX * reach, corner[1] - arrivingY * reach],
    leave: [corner[0] + leavingX * reach, corner[1] + leavingY * reach],
  };
}

/**
 * Collects edges, corners and drawn pieces, and writes them out as SVG path data.
 *
 * A piece is a stretch the edges cannot describe, such as the head. It runs from a point on the edge before it to a point on the edge
 * after it, as a list of `["A", radius, end]` and `["C", first, second, end]`
 * segments in construction coordinates.
 */
class Outline {
  constructor() {
    this.items = [];
  }

  /**
   * @param {Line} line The edge.
   * @param {number} [radius] Rounds the corner where the outline leaves this edge for the next one.
   */
  edge(line, radius = 0) {
    this.items.push({ kind: "edge", line, radius });
  }

  /**
   * @param {[number, number]} start A point on the previous edge.
   * @param {Array} segments The drawn stretch.
   * @param {[number, number]} end A point on the next edge.
   */
  piece(start, segments, end) {
    this.items.push({ kind: "piece", start, segments, end });
  }

  /** Resolves every corner into the point where the outline arrives and the one it leaves from. */
  corners() {
    const resolved = new Map();
    const count = this.items.length;
    this.items.forEach((item, index) => {
      const following = this.items[(index + 1) % count];
      if (item.kind !== "edge" || following.kind !== "edge") {
        return;
      }
      if (item.radius <= 0) {
        const corner = intersect(item.line, following.line);
        resolved.set(index, { arrive: corner, leave: corner, radius: null });
        return;
      }
      const { arrive, leave } = roundedCorner(item.line, following.line, item.radius);
      resolved.set(index, { arrive, leave, radius: item.radius });
    });
    return resolved;
  }

  /** Fails when a rounded corner eats past the end of its edge. */
  checkSegments(resolved) {
    const count = this.items.length;
    this.items.forEach((item, index) => {
      if (item.kind !== "edge") {
        return;
      }
      const previousIndex = (index - 1 + count) % count;
      const previous = this.items[previousIndex];
      const following = this.items[(index + 1) % count];
      const start = previous.kind === "edge" ? resolved.get(previousIndex).leave : previous.end;
      const end = following.kind === "edge" ? resolved.get(index).arrive : following.start;
      const [dx, dy] = item.line.direction;
      const length = (end[0] - start[0]) * dx + (end[1] - start[1]) * dy;
      if (length < -1e-6) {
        throw new Error(`edge ${index} runs backwards by ${(-length).toFixed(4)}`);
      }
    });
  }

  /**
   * Writes the outline as one closed path.
   *
   * @param {(point: [number, number]) => [number, number]} place Maps a construction point.
   * @param {number} scale How lengths scale under `place`.
   * @param {(value: number) => string} [format] Writes a number into the path data.
   * @returns {string} SVG path data.
   */
  svg(place, scale, format = formatNumber) {
    const resolved = this.corners();
    this.checkSegments(resolved);
    const point = (value) => {
      const [x, y] = place(value);
      return `${format(x)} ${format(y)}`;
    };
    const arc = (radius, end) =>
      `A${format(radius * scale)} ${format(radius * scale)} 0 0 ${SWEEP_CONVEX} ${point(end)}`;

    // Start where the outline leaves the first resolved corner and go once
    // round, so the path also closes through that corner.
    const first = resolved.keys().next().value;
    const commands = [`M${point(resolved.get(first).leave)}`];
    const count = this.items.length;
    for (let step = 1; step <= count; step++) {
      const index = (first + step) % count;
      const item = this.items[index];
      if (item.kind === "piece") {
        commands.push(`L${point(item.start)}`);
        for (const segment of item.segments) {
          if (segment[0] === "A") {
            commands.push(arc(segment[1], segment[2]));
          } else {
            commands.push(`C${segment.slice(1).map(point).join(" ")}`);
          }
        }
        continue;
      }
      if (!resolved.has(index)) {
        continue;
      }
      const { arrive, leave, radius } = resolved.get(index);
      commands.push(`L${point(arrive)}`);
      if (radius !== null) {
        commands.push(arc(radius, leave));
      }
    }
    commands.push("Z");
    return commands.join("");
  }
}

/**
 * The head's curves in Bodoni coordinates, with the joints meant to be smooth made smooth.
 *
 * The drawing joins some of its curves at angles of a degree or so, where the
 * line is plainly meant to run on. Those joints are turned into tangent ones
 * by laying both handles along their mean direction. Joints that turn by more
 * than SMOOTH_LIMIT_DEGREES are corners on purpose: the ear tips, which
 * `roundedHead` rounds off afterwards, the ear bases and the throat.
 *
 * @returns {Array} The curves, each as four points.
 */
function smoothedHead() {
  const segments = HEAD.map((segment) => segment.map((point) => [...point]));
  for (let index = 0; index < segments.length - 1; index++) {
    const ending = segments[index];
    const starting = segments[index + 1];
    const joint = ending[3];
    const incoming = [joint[0] - ending[2][0], joint[1] - ending[2][1]];
    const outgoing = [starting[1][0] - joint[0], starting[1][1] - joint[1]];
    const incomingLength = Math.hypot(...incoming);
    const outgoingLength = Math.hypot(...outgoing);
    const cosine =
      (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / (incomingLength * outgoingLength);
    const angle = (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
    if (angle >= SMOOTH_LIMIT_DEGREES) {
      continue;
    }
    const sum = [
      incoming[0] / incomingLength + outgoing[0] / outgoingLength,
      incoming[1] / incomingLength + outgoing[1] / outgoingLength,
    ];
    const sumLength = Math.hypot(...sum);
    const mean = [sum[0] / sumLength, sum[1] / sumLength];
    ending[2] = [joint[0] - mean[0] * incomingLength, joint[1] - mean[1] * incomingLength];
    starting[1] = [joint[0] + mean[0] * outgoingLength, joint[1] + mean[1] * outgoingLength];
  }
  return segments;
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

/**
 * The direction a cubic Bézier curve runs in at a point, as its derivative.
 *
 * @param {Array} curve Start, first handle, second handle and end.
 * @param {number} along The curve's parameter.
 * @returns {[number, number]} Not of unit length.
 */
function bezierDirection([start, first, second, end], along) {
  const rest = 1 - along;
  return [0, 1].map(
    (axis) =>
      3 * rest * rest * (first[axis] - start[axis]) +
      6 * rest * along * (second[axis] - first[axis]) +
      3 * along * along * (end[axis] - second[axis]),
  );
}

/**
 * Splits a cubic Bézier curve in two at a parameter, by de Casteljau's construction.
 *
 * @param {Array} curve Start, first handle, second handle and end.
 * @param {number} along Where to split.
 * @returns {[Array, Array]} The part before and the part after, each as four points.
 */
function splitBezier([start, first, second, end], along) {
  const mix = (from, to) => [
    from[0] + (to[0] - from[0]) * along,
    from[1] + (to[1] - from[1]) * along,
  ];
  const startSide = mix(start, first);
  const handles = mix(first, second);
  const endSide = mix(second, end);
  const beforeSplit = mix(startSide, handles);
  const afterSplit = mix(handles, endSide);
  const split = mix(beforeSplit, afterSplit);
  return [
    [start, startSide, beforeSplit, split],
    [split, afterSplit, endSide, end],
  ];
}

/**
 * The stretch of a cubic Bézier curve between two parameters, as a curve of its own.
 *
 * @param {Array} curve Start, first handle, second handle and end.
 * @param {number} from Where the stretch begins, below 1.
 * @param {number} to Where it ends, above `from`.
 * @returns {Array} Four points.
 */
function bezierPart(curve, from, to) {
  const [, tail] = splitBezier(curve, from);
  return splitBezier(tail, (to - from) / (1 - from))[0];
}

/**
 * Where a circle rounds off a corner of the head drawing, touching the curve
 * that arrives at the corner and the one that leaves it.
 *
 * The circle can reach past the curve on either side into the next one, so a
 * place on the drawing is a curve's index and a parameter on that curve. The
 * places are found by Newton's method, starting from where the circle would
 * touch if both curves ran on straight from the corner.
 *
 * @param {Array} curves The head drawing, each curve as four points.
 * @param {number} joint The index of the curve that ends in the corner.
 * @param {number} radius The circle's radius. The corner must turn by less
 *   than half a circle.
 * @returns {{ arrive: { index: number, along: number }, leave: { index: number, along: number } }}
 *   Where the outline leaves the curves for the arc, and where it returns to them.
 */
function cornerRounding(curves, joint, radius) {
  // How far the circle reaches back from the corner and on from it, counted
  // in curves, so that the search can run on past the end of one.
  const arrivePlace = (reach) => ({
    index: joint - Math.floor(reach),
    along: 1 - (reach - Math.floor(reach)),
  });
  const leavePlace = (reach) => ({
    index: joint + 1 + Math.floor(reach),
    along: reach - Math.floor(reach),
  });
  const arriving = bezierDirection(curves[joint], 1);
  const leaving = bezierDirection(curves[joint + 1], 0);
  // The circle lies on the side the corner turns towards.
  const side = Math.sign(arriving[0] * leaving[1] - arriving[1] * leaving[0]);
  const center = ({ index, along }) => {
    const curve = curves[index];
    if (curve === undefined) {
      throw new Error(`the round at joint ${joint} runs off the drawing`);
    }
    const point = bezierPoint(curve, along);
    const direction = bezierDirection(curve, along);
    const length = Math.hypot(...direction);
    return [
      point[0] - (side * direction[1] * radius) / length,
      point[1] + (side * direction[0] * radius) / length,
    ];
  };
  const mismatch = ([back, on]) => {
    const fromArriving = center(arrivePlace(back));
    const fromLeaving = center(leavePlace(on));
    return [fromArriving[0] - fromLeaving[0], fromArriving[1] - fromLeaving[1]];
  };

  const turn = Math.acos(
    (arriving[0] * leaving[0] + arriving[1] * leaving[1]) /
      (Math.hypot(...arriving) * Math.hypot(...leaving)),
  );
  const straightReach = radius * Math.tan(turn / 2);
  let reaches = [straightReach / Math.hypot(...arriving), straightReach / Math.hypot(...leaving)];
  for (let step = 0; step < ROUNDING_STEPS; step++) {
    const residual = mismatch(reaches);
    if (Math.hypot(...residual) < ROUNDING_TOLERANCE) {
      if (reaches[0] <= 0 || reaches[1] <= 0) {
        throw new Error(`the round at joint ${joint} touches outside the corner`);
      }
      return { arrive: arrivePlace(reaches[0]), leave: leavePlace(reaches[1]) };
    }
    const columns = [0, 1].map((axis) => {
      const nudged = [...reaches];
      nudged[axis] += ROUNDING_NUDGE;
      const moved = mismatch(nudged);
      return [(moved[0] - residual[0]) / ROUNDING_NUDGE, (moved[1] - residual[1]) / ROUNDING_NUDGE];
    });
    const determinant = columns[0][0] * columns[1][1] - columns[1][0] * columns[0][1];
    reaches = [
      reaches[0] - (residual[0] * columns[1][1] - residual[1] * columns[1][0]) / determinant,
      reaches[1] - (columns[0][0] * residual[1] - columns[0][1] * residual[0]) / determinant,
    ];
  }
  throw new Error(`the round at joint ${joint} does not settle`);
}

/**
 * The head drawing with the tips of both ears rounded, in its own coordinates.
 *
 * Each tip becomes an arc of EAR_TIP_RADIUS that touches the curves on both
 * sides, as every other rounded corner of the marks does. The curves are cut
 * where the arc touches them, and whatever lay between falls away.
 *
 * @returns {{ start: [number, number], segments: Array }} Where the drawing
 *   begins, and its segments as `["C", first, second, end]` and
 *   `["A", radius, end]`.
 */
function roundedHead() {
  const curves = smoothedHead();
  const segments = [];
  const appendCurves = (from, to) => {
    for (let index = from.index; index <= to.index; index++) {
      const [, first, second, end] = bezierPart(
        curves[index],
        index === from.index ? from.along : 0,
        index === to.index ? to.along : 1,
      );
      segments.push(["C", first, second, end]);
    }
  };
  let from = { index: 0, along: 0 };
  for (const joint of EAR_TIP_JOINTS) {
    const { arrive, leave } = cornerRounding(curves, joint, EAR_TIP_RADIUS);
    appendCurves(from, arrive);
    segments.push(["A", EAR_TIP_RADIUS, bezierPoint(curves[leave.index], leave.along)]);
    from = leave;
  }
  appendCurves(from, { index: curves.length - 1, along: 1 });
  return { start: curves[0][0], segments };
}

/**
 * The head as a piece from the back of the neck to the throat, in construction
 * coordinates: the head drawing's own, turned over so that y points up.
 *
 * @returns {{ start: [number, number], segments: Array, end: [number, number] }}
 */
function headPiece() {
  const place = ([x, y]) => [x, -y];
  const { start, segments } = roundedHead();
  return {
    start: place(start),
    segments: segments.map((segment) =>
      segment[0] === "A"
        ? ["A", segment[1], place(segment[2])]
        : ["C", place(segment[1]), place(segment[2]), place(segment[3])],
    ),
    end: place(segments.at(-1).at(-1)),
  };
}

/**
 * The icon's tile as a squircle, the superellipse with ICON_SQUIRCLE_EXPONENT
 * stretched over the tile, written as cubic curves.
 *
 * The first eighth runs from the middle of the right side to the diagonal,
 * with x following from y. The second runs on to the middle of the top side,
 * with y following from x. Each curve takes the superellipse's own points and
 * directions at both of its ends, so the curves meet without a kink, on the
 * diagonals and in the middle of the sides as well. The other three quarters
 * are the first one turned.
 *
 * @param {(value: number) => string} format Writes a number into the path data.
 * @returns {string} SVG path data in the tile's square.
 */
function squirclePath(format) {
  const exponent = ICON_SQUIRCLE_EXPONENT;
  const diagonal = 2 ** (-1 / exponent);
  const across = (along) => (1 - along ** exponent) ** (1 / exponent);
  const slope = (along) =>
    -(along ** (exponent - 1)) * (1 - along ** exponent) ** (1 / exponent - 1);
  // Where the curves of an eighth meet, closer together towards the diagonal,
  // where the squircle bends most.
  const towardsDiagonal = [];
  for (let index = 0; index <= ICON_SQUIRCLE_CURVES; index++) {
    towardsDiagonal.push(diagonal * Math.sin((Math.PI / 2) * (index / ICON_SQUIRCLE_CURVES)));
  }
  const eighths = [
    {
      point: (along) => [across(along), along],
      direction: (along) => [slope(along), 1],
      stations: towardsDiagonal,
    },
    {
      point: (along) => [along, across(along)],
      direction: (along) => [1, slope(along)],
      stations: [...towardsDiagonal].reverse(),
    },
  ];
  const quarter = [];
  for (const { point, direction, stations } of eighths) {
    for (let index = 0; index < ICON_SQUIRCLE_CURVES; index++) {
      const start = stations[index];
      const end = stations[index + 1];
      const third = (end - start) / 3;
      const startPoint = point(start);
      const endPoint = point(end);
      const startDirection = direction(start);
      const endDirection = direction(end);
      quarter.push([
        startPoint,
        [startPoint[0] + startDirection[0] * third, startPoint[1] + startDirection[1] * third],
        [endPoint[0] - endDirection[0] * third, endPoint[1] - endDirection[1] * third],
        endPoint,
      ]);
    }
  }

  const half = ICON_TILE / 2;
  const turned = (point, quarters) => {
    let [horizontal, vertical] = point;
    for (let turn = 0; turn < quarters; turn++) {
      [horizontal, vertical] = [-vertical, horizontal];
    }
    return [horizontal, vertical];
  };
  // The squircle's y points up, the tile's down.
  const place = (point, quarters) => {
    const [horizontal, vertical] = turned(point, quarters);
    return `${format(half + horizontal * half)} ${format(half - vertical * half)}`;
  };
  const commands = [`M${place(quarter[0][0], 0)}`];
  for (let quarters = 0; quarters < 4; quarters++) {
    for (const [, first, second, end] of quarter) {
      commands.push(
        `C${place(first, quarters)} ${place(second, quarters)} ${place(end, quarters)}`,
      );
    }
  }
  commands.push("Z");
  return commands.join("");
}

/**
 * Constructs the icon: the llama's head on a stub of neck, cut out of a tile
 * shaped as a squircle.
 *
 * The neck is as wide as the head drawing's own. It runs on ICON_NECK_SHARE of
 * its width below the throat and
 * ends in a straight cut whose corners are rounded. Its back curves outward
 * from the head and stands ICON_NECK_TAPER_SHARE of its width further in at
 * the cut. The figure stands ICON_MARGIN from the tile's edge on its taller
 * side and is centered on both axes.
 *
 * @param {(value: number) => string} [format] Writes a number into the path
 *   data. The default writes three decimals, as the drawing is committed.
 * @returns {{ tile: string, head: string }} SVG path data in a 512 unit square.
 */
export function iconPaths(format = formatNumber) {
  const [neckLeft, neckRight] = BODONI_NECK;
  const neckWidth = neckRight - neckLeft;
  const head = headPiece();
  const neckBottom = head.end[1] - neckWidth * ICON_NECK_SHARE;

  const neckCorner = neckWidth * ICON_NECK_CORNER_SHARE;
  const cut = new Line([0, neckBottom], [1, 0]);
  // The back of the neck is a parabola from the cut to the head. Its control
  // point stands straight below the head, so the back leaves the head
  // tangentially and bends in towards the cut, curving outward all the way.
  // The cut's corner rounds into the parabola's tangent at the foot, and the
  // curve starts where that arc ends.
  const backFoot = [neckRight - neckWidth * ICON_NECK_TAPER_SHARE, neckBottom];
  const backBend = [neckRight, head.start[1] - (head.start[1] - neckBottom) * ICON_NECK_BEND_SHARE];
  const back = Line.through(backFoot, backBend);
  const backStart = roundedCorner(cut, back, neckCorner).leave;
  const backCurve = [
    "C",
    [
      backStart[0] + (2 / 3) * (backBend[0] - backStart[0]),
      backStart[1] + (2 / 3) * (backBend[1] - backStart[1]),
    ],
    [
      head.start[0] + (2 / 3) * (backBend[0] - head.start[0]),
      head.start[1] + (2 / 3) * (backBend[1] - head.start[1]),
    ],
    head.start,
  ];

  const outline = new Outline();
  outline.edge(cut, neckCorner);
  outline.edge(back);
  outline.piece(backStart, [backCurve, ...head.segments], head.end);
  outline.edge(new Line([neckLeft, 0], [0, -1]), neckCorner);

  // Measured on the drawing itself, so the fit follows the curves of the head
  // rather than its control points.
  const [boundsX, boundsY, boundsWidth, boundsHeight] = pathBounds(
    outline.svg(([x, y]) => [x, -y], 1),
  );
  const unit = (ICON_TILE - 2 * ICON_MARGIN) / Math.max(boundsWidth, boundsHeight);
  const offsetX = (ICON_TILE - boundsWidth * unit) / 2;
  const offsetY = (ICON_TILE - boundsHeight * unit) / 2;
  const place = ([x, y]) => [offsetX + (x - boundsX) * unit, offsetY + (-y - boundsY) * unit];

  return { tile: squirclePath(format), head: outline.svg(place, unit, format) };
}

const COMMAND = /[MLAHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/g;
const ARGUMENT_COUNT = { M: 2, L: 2, H: 1, V: 1, A: 7, C: 6, Z: 0 };

/**
 * Splits path data into drawn segments, each with the direction it leaves and arrives in.
 *
 * Understands the absolute M, L, H, V, A, C and Z this generator writes. An
 * arc is taken as the small arc of a circle, which every arc here is.
 *
 * @param {string} path SVG path data.
 * @returns {Array<Array<{ kind: string, start: number[], end: number[], leaving: number[], arriving: number[], center?: number[], radius?: number, sweep?: number }>>}
 *   The segments of each contour.
 */
export function pathContours(path) {
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
 * The wordmark as a complete SVG file: the icon on the left and "LMAA" on its
 * right.
 *
 * The icon stands WORDMARK_ICON_SIZE high, centered on the letters' cap
 * height, and WORDMARK_GAP from the L's ink. Its head stays cut out, so the
 * ground shows through it. The box is the ink's own, without a margin, so a
 * place that shows the wordmark decides the space around it.
 *
 * @returns {string}
 */
function wordmarkSvg() {
  const { tile, head } = iconPaths();
  const [lettersX, lettersY, lettersWidth, lettersHeight] = pathBounds(LETTERS);
  // The squircle touches all four sides of its tile, so the tile is its box.
  const iconX = lettersX - WORDMARK_GAP - WORDMARK_ICON_SIZE;
  const iconY = -(LETTERS_CAP_HEIGHT + WORDMARK_ICON_SIZE) / 2;
  const top = Math.min(iconY, lettersY);
  const bottom = Math.max(iconY + WORDMARK_ICON_SIZE, lettersY + lettersHeight);
  const viewBox = [iconX, top, lettersX + lettersWidth - iconX, bottom - top]
    .map(formatNumber)
    .join(" ");
  // The scale is written in full, because three decimals would shrink the
  // icon by a hundredth of a percent.
  const iconPlacement = `translate(${formatNumber(iconX)} ${formatNumber(iconY)}) scale(${WORDMARK_ICON_SIZE / ICON_TILE})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
    `<path fill="currentColor" fill-rule="evenodd" transform="${iconPlacement}" d="${tile}${head}"/>` +
    `<path fill="currentColor" d="${LETTERS}"/></svg>\n`
  );
}

/**
 * Both drawings as complete SVG files.
 *
 * `wordmarkSvg` describes the wordmark. The icon keeps the head as a path of
 * its own with the class `lmaa-icon-head` and no fill, so a place that wants
 * the head in a color of its own can fill it.
 *
 * @returns {{ wordmark: string, icon: string }}
 */
export function buildMarks() {
  const { tile, head } = iconPaths();
  return {
    wordmark: wordmarkSvg(),
    icon:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_TILE} ${ICON_TILE}">` +
      `<path fill="currentColor" fill-rule="evenodd" d="${tile}${head}"/>` +
      `<path class="lmaa-icon-head" fill="none" d="${head}"/></svg>\n`,
  };
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
  const marks = buildMarks();
  await writeFile(MARK_FILES.wordmark, marks.wordmark);
  await writeFile(MARK_FILES.icon, marks.icon);
  console.log("marks written: packages/ui/src/assets/marks/lmaa-wordmark.svg and lmaa-icon.svg");
}
