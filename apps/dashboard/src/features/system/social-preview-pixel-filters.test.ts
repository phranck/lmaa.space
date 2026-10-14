import { describe, expect, it } from "vitest";

import { applyBrightnessContrast } from "@/features/system/social-preview-pixel-filters.ts";

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
