import { describe, expect, it } from "vitest";

import { createTextLayer } from "@/features/system/social-preview-renderer.ts";
import {
  canvasShadowOffset,
  cssTextShadow,
  DEFAULT_TEXT_SHADOW,
  getTextShadowSettings,
  resolveTextShadow,
  textShadowColor,
} from "@/features/system/social-preview-text-shadow.ts";

describe("getTextShadowSettings", () => {
  it("fills in the defaults for a layer stored before shadows existed", () => {
    expect(getTextShadowSettings(createTextLayer())).toEqual(DEFAULT_TEXT_SHADOW);
  });

  it("keeps the values a layer has", () => {
    const layer = {
      ...createTextLayer(),
      shadowColor: "#336699",
      shadowBlur: 0,
      shadowOffsetY: -12,
    };
    expect(getTextShadowSettings(layer)).toEqual({
      ...DEFAULT_TEXT_SHADOW,
      color: "#336699",
      blur: 0,
      offsetY: -12,
    });
  });
});

describe("resolveTextShadow", () => {
  it("draws no shadow until it is switched on", () => {
    expect(resolveTextShadow(createTextLayer())).toBeNull();
    expect(resolveTextShadow({ ...createTextLayer(), shadow: false, shadowBlur: 20 })).toBeNull();
  });

  it("draws the layer's shadow once it is on", () => {
    expect(resolveTextShadow({ ...createTextLayer(), shadow: true, shadowBlur: 20 })?.blur).toBe(
      20,
    );
  });
});

describe("textShadowColor", () => {
  it("adds the opacity to the color as an alpha byte", () => {
    expect(textShadowColor({ ...DEFAULT_TEXT_SHADOW, color: "#336699", opacity: 0.5 })).toBe(
      "#33669980",
    );
    expect(textShadowColor({ ...DEFAULT_TEXT_SHADOW, opacity: 1 })).toBe("#000000ff");
    expect(textShadowColor({ ...DEFAULT_TEXT_SHADOW, opacity: 0 })).toBe("#00000000");
  });
});

describe("cssTextShadow", () => {
  it("writes offset, blur and color in canvas pixels", () => {
    expect(cssTextShadow(DEFAULT_TEXT_SHADOW)).toBe("4px 4px 8px #00000080");
  });
});

describe("canvasShadowOffset", () => {
  it("keeps the offset of an unrotated layer", () => {
    const offset = canvasShadowOffset({ ...DEFAULT_TEXT_SHADOW, offsetX: 4, offsetY: 6 }, 0);
    expect(offset.x).toBeCloseTo(4);
    expect(offset.y).toBeCloseTo(6);
  });

  it("turns the offset with the layer, as CSS turns the shadow with its element", () => {
    const quarterTurn = canvasShadowOffset({ ...DEFAULT_TEXT_SHADOW, offsetX: 4, offsetY: 0 }, 90);
    expect(quarterTurn.x).toBeCloseTo(0);
    expect(quarterTurn.y).toBeCloseTo(4);

    const halfTurn = canvasShadowOffset({ ...DEFAULT_TEXT_SHADOW, offsetX: 4, offsetY: 6 }, 180);
    expect(halfTurn.x).toBeCloseTo(-4);
    expect(halfTurn.y).toBeCloseTo(-6);
  });
});
