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
