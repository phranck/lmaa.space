#!/usr/bin/env node
/**
 * Constructs the LMAA wordmark and icon and writes them to the marks folder of
 * `@lmaa/ui`, `packages/ui/src/assets/marks/`.
 *
 * The drawings are built rather than traced. Every straight edge of L, M and
 * A was measured off Google Sans Flex at wght 559, wdth 125, ROND 100 and opsz
 * 144, in units where the cap height is 100. Every rounded corner is a circular
 * arc that touches both of its edges, so no edge meets an arc at an angle.
 *
 * The letters run into one another. The foot of the L carries the left stem
 * of the M, whose right edge stands on the end of the foot. Where two round
 * feet meet, at M to A and at A to A, the bottom is a single arc with the
 * font's foot radius, touching the edge on either side and resting on the line
 * the round feet reach; that arc decides how far apart the two letters stand.
 * Each A's crossbar hangs from its right leg only and ends on the left in a
 * round cap, a bar's thickness away from the left leg.
 *
 * The llama's head is the drawing from the Bodoni Moda wordmark, fitted to the
 * stem of the L. It is the one part made of Bézier curves, because it is a
 * drawing rather than geometry. The tips of its ears are rounded like every
 * other corner, with an arc that touches the curves on both sides.
 *
 * Construction runs with y pointing up and the baseline at 0; the SVG output
 * turns it over.
 *
 * Run `npm run brand:marks` after changing anything here, and commit the
 * drawings it writes. `build-brand-marks.test.mjs` fails while they differ.
 */
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Measured edges of the three letters, in their own coordinates.
const L_STEM_LEFT = 9.21;
const L_STEM_RIGHT = 29.896;
const L_FOOT_TOP = 17.354;
const L_FOOT_END = 94.209;
const M_LEFT_STEM = [9.21, 28.963];
const M_RIGHT_STEM = [133.307, 152.917];
const M_BOTTOM = -1.071;
const M_LEFT_DIAGONAL_LOWER = [
  [28.964, 71.74],
  [71.495, 4.483],
];
const M_RIGHT_DIAGONAL_LOWER = [
  [90.466, 4.483],
  [133.307, 72.254],
];
const M_RIGHT_DIAGONAL_UPPER = [
  [127.091, 93.69],
  [81.541, 23.476],
];
const M_LEFT_DIAGONAL_UPPER = [
  [81.536, 23.476],
  [36.377, 93.477],
];
const A_LEFT_OUTER = [
  [54.921, 93.502],
  [6.508, 13.244],
];
const A_LEFT_INNER = [
  [21.578, 3.633],
  [64.439, 74.67],
];
const A_INNER_APEX = [
  [64.439, 74.67],
  [66.412, 77.004],
  [66.419, 77.004],
  [68.35, 74.66],
];
const A_RIGHT_INNER = [
  [68.35, 74.66],
  [111.048, 3.728],
];
const A_RIGHT_OUTER = [
  [126.386, 13.721],
  [78.2, 93.502],
];
const A_BAR = [22.949, 36.588];
const A_BOTTOM = -1.045;

// Tangent points of the font's rounded corners, which fix their radii.
const FONT_CORNERS = {
  lBottomLeft: [
    [9.21, 10.662],
    [20.499, 0],
  ],
  mVertex: [
    [71.495, 4.483],
    [90.466, 4.483],
  ],
  mTopLeft: [
    [36.377, 93.477],
    [9.219, 85.951],
  ],
  mTopRight: [
    [152.917, 86.542],
    [127.091, 93.69],
  ],
  aApex: [
    [78.2, 93.502],
    [54.921, 93.502],
  ],
  aFootInner: [
    [111.048, 3.728],
    [119.493, -1.045],
  ],
};

// The llama's head as drawn for the Bodoni wordmark: its neck spans x 69.69
// to 90.37 there, its crown sits on the cap line at y 61.97, and y points
// down. The curves run from the back of the neck over the ears and the snout
// to the throat. The last control point of the first curve stands straight
// above the neck, so the back of the head leaves the stem without a kink.
const BODONI_NECK = [69.69, 90.37];
const BODONI_CAP_LINE = 61.97;
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
// The squircle is the superellipse |x|^5 + |y|^5 = 1 stretched over the tile.
// With exponent 5 its corners reach as far out along the diagonal as circular
// corners of 22 percent of the side would. Each eighth of it, from the middle
// of a side to the diagonal, is written as ICON_SQUIRCLE_CURVES cubic curves.
export const ICON_SQUIRCLE_EXPONENT = 5;
const ICON_SQUIRCLE_CURVES = 6;
const ICON_MARGIN = 32;
// How far the neck runs on below the throat, as a share of its width, and the
// radius of the two corners of its straight cut, as a share as well.
const ICON_NECK_SHARE = 0.6;
const ICON_NECK_CORNER_SHARE = 0.2;
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
   * @param {[number, number]} start First point, in the letter's own coordinates.
   * @param {[number, number]} end Second point, travelled towards.
   * @param {number} [offset] How far right the letter stands.
   * @returns {Line} The edge through both points.
   */
  static through(start, end, offset = 0) {
    return new Line([start[0] + offset, start[1]], [end[0] - start[0], end[1] - start[1]]);
  }

  /** The unit normal on the left of travel, which is the ink side of the outline. */
  get leftNormal() {
    return [-this.direction[1], this.direction[0]];
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
 * The radius of the circle that touches both edges where the font's curve leaves them.
 *
 * @param {Line} first
 * @param {Line} second
 * @param {[[number, number], [number, number]]} tangents Where the font's curve meets each edge.
 * @returns {number} The fillet radius.
 */
function fittedRadius(first, second, [tangentFirst, tangentSecond]) {
  const corner = intersect(first, second);
  const reach = (distance(corner, tangentFirst) + distance(corner, tangentSecond)) / 2;
  const vectors = [tangentFirst, tangentSecond].map((tangent) => [
    tangent[0] - corner[0],
    tangent[1] - corner[1],
  ]);
  const cosine =
    (vectors[0][0] * vectors[1][0] + vectors[0][1] * vectors[1][1]) /
    (Math.hypot(...vectors[0]) * Math.hypot(...vectors[1]));
  const interior = Math.acos(Math.max(-1, Math.min(1, cosine)));
  return reach * Math.tan(interior / 2);
}

/**
 * How far right a letter has to stand for one of its edges to touch a circle from the ink side.
 *
 * @param {[number, number]} center
 * @param {number} radius
 * @param {[[number, number], [number, number]]} edge The edge, in the letter's own coordinates.
 * @returns {number} The letter's offset.
 */
function offsetForTangency(center, radius, [start, end]) {
  const line = Line.through(start, end);
  const normal = line.leftNormal;
  const reach = (center[0] - line.point[0]) * normal[0] + (center[1] - line.point[1]) * normal[1];
  return (reach - radius) / normal[0];
}

/**
 * Collects edges, corners and drawn pieces, and writes them out as SVG path data.
 *
 * A piece is a stretch the edges cannot describe, such as the head or the cap
 * of a bar. It runs from a point on the edge before it to a point on the edge
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
      const corner = intersect(item.line, following.line);
      if (item.radius <= 0) {
        resolved.set(index, { arrive: corner, leave: corner, radius: null });
        return;
      }
      const turn = turnBetween(item.line, following.line);
      if (turn <= 0) {
        throw new Error(`corner after item ${index} turns right and cannot take a radius`);
      }
      const reach = item.radius * Math.tan(turn / 2);
      const [fx, fy] = item.line.direction;
      const [sx, sy] = following.line.direction;
      resolved.set(index, {
        arrive: [corner[0] - fx * reach, corner[1] - fy * reach],
        leave: [corner[0] + sx * reach, corner[1] + sy * reach],
        radius: item.radius,
      });
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
 * The head as a piece from the back of the neck to the throat, in construction coordinates.
 *
 * @param {number} stemLeft Where the left edge of the L's stem stands.
 * @param {number} scale How much smaller or larger than in Bodoni the head is drawn.
 */
function headPiece(stemLeft, scale) {
  const place = (point) => [
    stemLeft + (point[0] - BODONI_NECK[0]) * scale,
    100 - (point[1] - BODONI_CAP_LINE) * scale,
  ];
  const { start, segments } = roundedHead();
  return {
    start: place(start),
    segments: segments.map((segment) =>
      segment[0] === "A"
        ? ["A", segment[1] * scale, place(segment[2])]
        : ["C", place(segment[1]), place(segment[2]), place(segment[3])],
    ),
    end: place(segments.at(-1).at(-1)),
  };
}

const headScale = (L_STEM_RIGHT - L_STEM_LEFT) / (BODONI_NECK[1] - BODONI_NECK[0]);

/** The radii of the font's rounded corners, fitted from where its curves meet the edges. */
function fontRadii() {
  return {
    lBottomLeft: fittedRadius(
      new Line([L_STEM_LEFT, 0], [0, -1]),
      new Line([0, 0], [1, 0]),
      FONT_CORNERS.lBottomLeft,
    ),
    mVertex: fittedRadius(
      Line.through(...M_LEFT_DIAGONAL_LOWER),
      Line.through(...M_RIGHT_DIAGONAL_LOWER),
      FONT_CORNERS.mVertex,
    ),
    mTopLeft: fittedRadius(
      Line.through(...M_LEFT_DIAGONAL_UPPER),
      new Line([M_LEFT_STEM[0], 0], [0, -1]),
      FONT_CORNERS.mTopLeft,
    ),
    mTopRight: fittedRadius(
      new Line([M_RIGHT_STEM[1], 0], [0, 1]),
      Line.through(...M_RIGHT_DIAGONAL_UPPER),
      FONT_CORNERS.mTopRight,
    ),
    aApex: fittedRadius(
      Line.through(...A_RIGHT_OUTER),
      Line.through(...A_LEFT_OUTER),
      FONT_CORNERS.aApex,
    ),
    aFootInner: fittedRadius(
      Line.through(...A_RIGHT_INNER),
      new Line([0, A_BOTTOM], [1, 0]),
      FONT_CORNERS.aFootInner,
    ),
  };
}

/**
 * Constructs the wordmark as one closed outline.
 *
 * @param {(value: number) => string} [format] Writes a number into the path
 *   data. The default writes three decimals, as the drawing is committed.
 * @returns {string} SVG path data with y pointing down and the baseline at 0.
 */
export function wordmarkPath(format = formatNumber) {
  const radii = fontRadii();
  const mOffset = L_FOOT_END - M_LEFT_STEM[1];
  const mCap = (M_RIGHT_STEM[1] - M_RIGHT_STEM[0]) / 2;

  // M to A: the M's stem rounds into the A's left leg with the stem's own cap radius.
  const mToACenter = [M_RIGHT_STEM[0] + mOffset + mCap, M_BOTTOM + mCap];
  const a1Offset = offsetForTangency(mToACenter, mCap, A_LEFT_INNER);
  // A to A: the right leg of the first A rounds into the left leg of the second.
  const aRadius = radii.aFootInner;
  const firstRightInner = Line.through(...A_RIGHT_INNER, a1Offset);
  const height = A_BOTTOM + aRadius;
  const firstNormal = firstRightInner.leftNormal;
  const centerX =
    firstRightInner.point[0] +
    (aRadius - (height - firstRightInner.point[1]) * firstNormal[1]) / firstNormal[0];
  const a2Offset = offsetForTangency([centerX, height], aRadius, A_LEFT_INNER);

  // The font draws the crossbar thinner than any other stroke. Here it takes
  // the weight of the L's foot, the wordmark's other horizontal, on the line
  // the font's bar is centered on.
  const barMiddle = (A_BAR[0] + A_BAR[1]) / 2;
  const barRadius = L_FOOT_TOP / 2;
  const barBottom = barMiddle - barRadius;
  const barTop = barMiddle + barRadius;
  const barGap = L_FOOT_TOP;

  const outline = new Outline();
  outline.edge(new Line([0, 0], [1, 0]), L_FOOT_TOP / 2);
  outline.edge(new Line([M_LEFT_STEM[1] + mOffset, 0], [0, 1]));
  outline.edge(Line.through(...M_LEFT_DIAGONAL_LOWER, mOffset), radii.mVertex);
  outline.edge(Line.through(...M_RIGHT_DIAGONAL_LOWER, mOffset));
  outline.edge(new Line([M_RIGHT_STEM[0] + mOffset, 0], [0, -1]), mCap);

  for (const [aOffset, last] of [
    [a1Offset, false],
    [a2Offset, true],
  ]) {
    const leftInner = Line.through(...A_LEFT_INNER, aOffset);
    outline.edge(leftInner);
    outline.edge(Line.through(A_INNER_APEX[0], A_INNER_APEX[1], aOffset));
    outline.edge(Line.through(A_INNER_APEX[2], A_INNER_APEX[3], aOffset));
    const rightInner = Line.through(...A_RIGHT_INNER, aOffset);
    outline.edge(rightInner);
    // The cap's center stands a bar's thickness plus its radius from the left leg.
    const normal = leftInner.leftNormal;
    const capX =
      leftInner.point[0] +
      (-(barRadius + barGap) - (barMiddle - leftInner.point[1]) * normal[1]) / normal[0];
    outline.edge(new Line([0, barTop], [-1, 0]));
    outline.piece(
      [capX, barTop],
      [
        ["A", barRadius, [capX - barRadius, barMiddle]],
        ["A", barRadius, [capX, barBottom]],
      ],
      [capX, barBottom],
    );
    outline.edge(new Line([0, barBottom], [1, 0]));
    outline.edge(rightInner, last ? radii.aFootInner : aRadius);
  }

  // The free foot of the last A: one rounding into the bottom, one out of it,
  // meeting at a single lowest point.
  const lastRightInner = Line.through(...A_RIGHT_INNER, a2Offset);
  const bottom = new Line([0, A_BOTTOM], [1, 0]);
  const lastRightOuter = Line.through(...A_RIGHT_OUTER, a2Offset);
  const innerReach = radii.aFootInner * Math.tan(turnBetween(lastRightInner, bottom) / 2);
  const outerRadius =
    (distance(intersect(lastRightInner, bottom), intersect(bottom, lastRightOuter)) - innerReach) /
    Math.tan(turnBetween(bottom, lastRightOuter) / 2);
  outline.edge(bottom, outerRadius);
  outline.edge(lastRightOuter, radii.aApex);
  outline.edge(Line.through(...A_LEFT_OUTER, a2Offset));
  outline.edge(Line.through(...A_RIGHT_OUTER, a1Offset), radii.aApex);
  outline.edge(Line.through(...A_LEFT_OUTER, a1Offset));
  outline.edge(new Line([M_RIGHT_STEM[1] + mOffset, 0], [0, 1]), radii.mTopRight);
  outline.edge(Line.through(...M_RIGHT_DIAGONAL_UPPER, mOffset));
  outline.edge(Line.through(...M_LEFT_DIAGONAL_UPPER, mOffset), radii.mTopLeft);
  outline.edge(new Line([M_LEFT_STEM[0] + mOffset, 0], [0, -1]));
  outline.edge(new Line([0, L_FOOT_TOP], [-1, 0]));

  const head = headPiece(L_STEM_LEFT, headScale);
  outline.edge(new Line([L_STEM_RIGHT, 0], [0, 1]));
  outline.piece(head.start, head.segments, head.end);
  outline.edge(new Line([L_STEM_LEFT, 0], [0, -1]), radii.lBottomLeft);

  return outline.svg(([x, y]) => [x, -y], 1, format);
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
 * The head and the neck are the wordmark's, so the two marks share one
 * drawing. The neck runs on ICON_NECK_SHARE of its width below the throat and
 * ends in a straight cut whose corners are rounded. The figure stands
 * ICON_MARGIN from the tile's edge on its taller side and is centered on both
 * axes.
 *
 * @param {(value: number) => string} [format] Writes a number into the path
 *   data. The default writes three decimals, as the drawing is committed.
 * @returns {{ tile: string, head: string }} SVG path data in a 512 unit square.
 */
export function iconPaths(format = formatNumber) {
  const neckWidth = L_STEM_RIGHT - L_STEM_LEFT;
  const head = headPiece(L_STEM_LEFT, headScale);
  const neckBottom = head.end[1] - neckWidth * ICON_NECK_SHARE;

  const outline = new Outline();
  outline.edge(new Line([0, neckBottom], [1, 0]), neckWidth * ICON_NECK_CORNER_SHARE);
  outline.edge(new Line([L_STEM_RIGHT, 0], [0, 1]));
  outline.piece(head.start, head.segments, head.end);
  outline.edge(new Line([L_STEM_LEFT, 0], [0, -1]), neckWidth * ICON_NECK_CORNER_SHARE);

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
 * Both drawings as complete SVG files.
 *
 * The wordmark's box is the ink's own, without a margin, so a place that
 * shows it decides the space around it. The icon keeps the head as a path of
 * its own with the class `lmaa-icon-head` and no fill, so a place that wants
 * the head in a color of its own can fill it.
 *
 * @returns {{ wordmark: string, icon: string }}
 */
export function buildMarks() {
  const mark = wordmarkPath();
  const viewBox = pathBounds(mark).map(formatNumber).join(" ");
  const { tile, head } = iconPaths();
  return {
    wordmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path fill="currentColor" d="${mark}"/></svg>\n`,
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
