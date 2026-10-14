import { describe, expect, it } from "vitest";

import {
  applyBrightnessContrast,
  applyGaussianBlur,
  gaussianBoxReaches,
} from "@/features/system/social-preview-pixel-filters.ts";

/** One pixel per entry, each given as red, green, blue and alpha. */
function pixels(...rgba: Array<[number, number, number, number]>) {
  return new Uint8ClampedArray(rgba.flat());
}

describe("applyBrightnessContrast", () => {
  it("leaves pixels alone at the neutral amounts", () => {
    const data = pixels([10, 128, 250, 200]);
    applyBrightnessContrast(data, 1, 1);
    expect([...data]).toEqual([10, 128, 250, 200]);
  });

  it("multiplies each color channel by the brightness, clipped at full", () => {
    const data = pixels([100, 50, 200, 255]);
    applyBrightnessContrast(data, 1.5, 1);
    expect([...data]).toEqual([150, 75, 255, 255]);
  });

  it("moves each channel toward or away from the middle by the contrast", () => {
    const data = pixels([0, 255, 64, 255]);
    applyBrightnessContrast(data, 1, 0.5);
    // (0 - 0.5) * 0.5 + 0.5 = 0.25, (1 - 0.5) * 0.5 + 0.5 = 0.75
    expect([...data]).toEqual([64, 191, 96, 255]);

    const flat = pixels([0, 255, 30, 255]);
    applyBrightnessContrast(flat, 1, 0);
    expect([...flat]).toEqual([128, 128, 128, 255]);
  });

  it("brightens before it changes the contrast, as the stage's filter list does", () => {
    const data = pixels([100, 0, 0, 255]);
    applyBrightnessContrast(data, 2, 2);
    // ((100 / 255) * 2 - 0.5) * 2 + 0.5 = 1.07, clipped to 255
    expect(data[0]).toBe(255);
  });

  it("clips the brightened channel before the contrast step, as a CSS filter list does", () => {
    const data = pixels([255, 0, 0, 255]);
    applyBrightnessContrast(data, 1.4, 0.7);
    // min(1, 1.4) = 1, then (1 - 0.5) * 0.7 + 0.5 = 0.85, which is 216.75
    expect(data[0]).toBe(217);
  });

  it("never touches alpha", () => {
    const data = pixels([100, 100, 100, 37]);
    applyBrightnessContrast(data, 0.2, 3);
    expect(data[3]).toBe(37);
  });
});

/** A transparent square region of `size` pixels with an opaque square of `color` in its middle. */
function squareOnTransparent(size: number, square: number, color: [number, number, number]) {
  const data = new Uint8ClampedArray(size * size * 4);
  const start = (size - square) / 2;
  for (let y = start; y < start + square; y++) {
    for (let x = start; x < start + square; x++) {
      data.set([...color, 255], (y * size + x) * 4);
    }
  }
  return data;
}

describe("gaussianBoxReaches", () => {
  it("uses three centered boxes for an odd box width", () => {
    // floor(2.5 * 3 * sqrt(2 * PI) / 4 + 0.5) = 5
    expect(gaussianBoxReaches(2.5)).toEqual([
      { before: 2, after: 2 },
      { before: 2, after: 2 },
      { before: 2, after: 2 },
    ]);
  });

  it("shifts two boxes half a pixel either way and widens the third for an even width", () => {
    // floor(2 * 3 * sqrt(2 * PI) / 4 + 0.5) = 4
    expect(gaussianBoxReaches(2)).toEqual([
      { before: 2, after: 1 },
      { before: 1, after: 2 },
      { before: 2, after: 2 },
    ]);
  });

  it("does nothing where the box would be a single pixel", () => {
    expect(gaussianBoxReaches(0)).toEqual([]);
    expect(gaussianBoxReaches(0.4)).toEqual([]);
  });
});

describe("applyGaussianBlur", () => {
  it("leaves the pixels alone without a blur", () => {
    const data = squareOnTransparent(9, 3, [255, 0, 0]);
    const before = [...data];
    applyGaussianBlur(data, 9, 9, 0);
    expect([...data]).toEqual(before);
  });

  it("spreads a spot evenly and keeps its coverage", () => {
    // A spot of 5 by 5 pixels rather than one, so the coverage survives being
    // rounded back to whole alpha levels.
    const size = 41;
    const spot = 5;
    const data = squareOnTransparent(size, spot, [255, 255, 255]);
    applyGaussianBlur(data, size, size, 4);

    const alphaAt = (x: number, y: number) => data[(y * size + x) * 4 + 3];
    const center = (size - 1) / 2;
    expect(alphaAt(center - 6, center)).toBe(alphaAt(center + 6, center));
    expect(alphaAt(center, center - 6)).toBe(alphaAt(center, center + 6));
    expect(alphaAt(center, center)).toBeGreaterThan(alphaAt(center + 6, center));
    expect(alphaAt(center + 6, center)).toBeGreaterThan(0);

    let coverage = 0;
    for (let index = 3; index < data.length; index += 4) coverage += data[index];
    expect(coverage / (spot * spot * 255)).toBeCloseTo(1, 1);
  });

  it("softens an edge without taking on the color of the transparent pixels around it", () => {
    const size = 40;
    const data = squareOnTransparent(size, 20, [255, 0, 0]);
    // Transparent pixels still hold a color. Blurred without premultiplying,
    // this green would bleed into the red edge.
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) data.set([0, 255, 0, 0], index);
    }
    applyGaussianBlur(data, size, size, 3);

    const edge = (20 * size + 8) * 4;
    expect(data[edge + 3]).toBeGreaterThan(0);
    expect(data[edge + 3]).toBeLessThan(255);
    expect(data[edge]).toBeGreaterThanOrEqual(254);
    expect(data[edge + 1]).toBe(0);
  });

  it("keeps a flat area flat", () => {
    const size = 40;
    const data = squareOnTransparent(size, 30, [10, 120, 200]);
    applyGaussianBlur(data, size, size, 2);
    const middle = (20 * size + 20) * 4;
    expect([...data.slice(middle, middle + 4)]).toEqual([10, 120, 200, 255]);
  });
});
