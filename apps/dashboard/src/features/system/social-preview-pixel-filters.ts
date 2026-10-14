/**
 * Image filters the social preview renderer applies to pixels itself.
 *
 * The canvas `filter` property would do the same work, but Safari ships it only
 * behind a feature flag and ignores it otherwise, so an image rendered there
 * would leave the filters out. The stage keeps CSS `filter`, which every
 * browser supports, and the functions here follow the same formulas so the two
 * agree.
 */

/** The number of values one color channel of an `ImageData` can take. */
const CHANNEL_VALUES = 256;

/**
 * Applies the CSS `brightness()` and then `contrast()` filter functions to
 * RGBA pixels, in place.
 *
 * Per color channel, on values from 0 to 1, brightness multiplies by `b` and
 * contrast maps `C` to `(C - 0.5) * c + 0.5`, which is how CSS defines them.
 * Chromium's canvas `filter` computes them on sRGB values, the ones
 * `ImageData` holds, and this matches its output to within 2 of 255 levels.
 * Alpha is left alone.
 *
 * @param pixels - Non-premultiplied RGBA data, as `getImageData` returns it.
 * @param brightness - The `brightness()` amount, where 1 changes nothing.
 * @param contrast - The `contrast()` amount, where 1 changes nothing.
 */
export function applyBrightnessContrast(
  pixels: Uint8ClampedArray,
  brightness: number,
  contrast: number,
): void {
  if (brightness === 1 && contrast === 1) return;

  // Every channel value maps to the same result wherever it occurs, so the
  // formula runs 256 times rather than once per pixel.
  const table = new Uint8ClampedArray(CHANNEL_VALUES);
  for (let value = 0; value < CHANNEL_VALUES; value++) {
    // Each filter function in a CSS filter list hands on a clipped image, so a
    // channel brightened past full enters the contrast step at full.
    const brightened = Math.min(1, (value / 255) * brightness);
    table[value] = ((brightened - 0.5) * contrast + 0.5) * 255;
  }

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = table[pixels[index]];
    pixels[index + 1] = table[pixels[index + 1]];
    pixels[index + 2] = table[pixels[index + 2]];
  }
}

/** How far a box blur reaches to the left and to the right of the pixel it computes. */
interface BoxReach {
  before: number;
  after: number;
}

/**
 * The three box blurs that stand in for a Gaussian blur of standard deviation
 * `sigma`, as the SVG specification defines them for `feGaussianBlur`.
 *
 * The box width is `d = floor(sigma * 3 * sqrt(2 * PI) / 4 + 0.5)`. An odd `d`
 * gives three centered boxes of width `d`. An even one gives two boxes of
 * width `d`, shifted half a pixel to either side so they cancel out, and one
 * centered box of width `d + 1`.
 *
 * @param sigma - The standard deviation in pixels.
 * @returns The reach of each of the three passes, or none where the boxes are
 *   a single pixel wide and would change nothing.
 */
export function gaussianBoxReaches(sigma: number): BoxReach[] {
  const width = Math.floor((sigma * 3 * Math.sqrt(2 * Math.PI)) / 4 + 0.5);
  if (width <= 1) return [];
  const half = Math.floor(width / 2);
  if (width % 2 === 1) {
    return [
      { before: half, after: half },
      { before: half, after: half },
      { before: half, after: half },
    ];
  }
  return [
    { before: half, after: half - 1 },
    { before: half - 1, after: half },
    { before: half, after: half },
  ];
}

/**
 * Blurs RGBA pixels in place as CSS `blur()` does, with a Gaussian of standard
 * deviation `sigma`.
 *
 * Each axis gets the three box blurs of {@link gaussianBoxReaches}. The color
 * channels are blurred premultiplied by alpha, because a transparent pixel's
 * color would otherwise bleed into the edge of a shape. Everything outside the
 * given pixels counts as transparent, so the caller passes a region with room
 * around what it blurs.
 *
 * @param pixels - Non-premultiplied RGBA data, as `getImageData` returns it.
 * @param width - The width of the region in pixels.
 * @param height - The height of the region in pixels.
 * @param sigma - The standard deviation in pixels, the value CSS `blur()` takes.
 */
export function applyGaussianBlur(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sigma: number,
): void {
  const reaches = gaussianBoxReaches(sigma);
  if (reaches.length === 0) return;

  let current = new Float32Array(pixels.length);
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    current[index] = pixels[index] * alpha;
    current[index + 1] = pixels[index + 1] * alpha;
    current[index + 2] = pixels[index + 2] * alpha;
    current[index + 3] = pixels[index + 3];
  }

  let next = new Float32Array(pixels.length);
  const sums = new Float64Array(Math.max(width, height) + 1);
  // Rows first, then columns: each axis is a set of lines, given as their
  // number, their length, and the steps between lines and between pixels.
  for (const [count, length, lineStep, pixelStep] of [
    [height, width, width * 4, 4],
    [width, height, 4, width * 4],
  ] as const) {
    for (const reach of reaches) {
      boxBlurLines(current, next, count, length, lineStep, pixelStep, reach, sums);
      [current, next] = [next, current];
    }
  }

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = current[index + 3];
    pixels[index + 3] = alpha;
    const scale = alpha > 0 ? 1 / (alpha / 255) : 0;
    pixels[index] = current[index] * scale;
    pixels[index + 1] = current[index + 1] * scale;
    pixels[index + 2] = current[index + 2] * scale;
  }
}

/**
 * One box blur along a set of parallel lines of pixels.
 *
 * Each output value is the mean over the box, with pixels beyond the ends of a
 * line counted as zero. A running sum makes the cost independent of the box
 * width.
 *
 * @param source - The values to read.
 * @param target - Receives the blurred values.
 * @param count - The number of lines.
 * @param length - The number of pixels in a line.
 * @param lineStep - The distance in array entries from one line to the next.
 * @param pixelStep - The distance in array entries from one pixel of a line to
 *   the next.
 * @param reach - How far the box reaches before and after each pixel.
 * @param sums - Scratch space of at least `length + 1` entries.
 */
function boxBlurLines(
  source: Float32Array,
  target: Float32Array,
  count: number,
  length: number,
  lineStep: number,
  pixelStep: number,
  reach: BoxReach,
  sums: Float64Array,
): void {
  const size = reach.before + reach.after + 1;
  for (let line = 0; line < count; line++) {
    const start = line * lineStep;
    for (let channel = 0; channel < 4; channel++) {
      sums[0] = 0;
      for (let position = 0; position < length; position++) {
        sums[position + 1] = sums[position] + source[start + position * pixelStep + channel];
      }
      for (let position = 0; position < length; position++) {
        const from = Math.max(0, position - reach.before);
        const to = Math.min(length, position + reach.after + 1);
        target[start + position * pixelStep + channel] = (sums[to] - sums[from]) / size;
      }
    }
  }
}
