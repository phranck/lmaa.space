import { describe, expect, it } from "vitest";

import { SOCIAL_PREVIEW_MAX_EDGE_PX } from "@lmaa/contracts";

import {
  clampCanvasEdge,
  fitStageScale,
  resizeCanvasByDrag,
  rulerStep,
  SOCIAL_PREVIEW_MIN_EDGE_PX,
} from "@/features/system/social-preview-canvas-size.ts";

describe("clampCanvasEdge", () => {
  it("rounds to whole pixels", () => {
    expect(clampCanvasEdge(1200.4)).toBe(1200);
    expect(clampCanvasEdge(629.6)).toBe(630);
  });

  it("keeps an edge within the range the API accepts", () => {
    expect(clampCanvasEdge(0)).toBe(SOCIAL_PREVIEW_MIN_EDGE_PX);
    expect(clampCanvasEdge(-50)).toBe(SOCIAL_PREVIEW_MIN_EDGE_PX);
    expect(clampCanvasEdge(SOCIAL_PREVIEW_MAX_EDGE_PX + 1)).toBe(SOCIAL_PREVIEW_MAX_EDGE_PX);
    expect(clampCanvasEdge(Number.NaN)).toBe(SOCIAL_PREVIEW_MIN_EDGE_PX);
  });
});

describe("fitStageScale", () => {
  it("leaves room to the right of the canvas for dragging", () => {
    const scale = fitStageScale({ width: 1200, height: 630 }, { width: 1000, height: 2000 });
    expect(1200 * scale).toBeLessThan(1000);
  });

  it("keeps a tall canvas within the window", () => {
    const scale = fitStageScale({ width: 1080, height: 1920 }, { width: 1000, height: 900 });
    expect(1920 * scale).toBeLessThan(900);
  });

  it("never enlarges a canvas beyond its own pixels", () => {
    expect(fitStageScale({ width: 200, height: 100 }, { width: 1000, height: 900 })).toBe(1);
  });
});

describe("rulerStep", () => {
  it("numbers every 100 pixels while there is room", () => {
    expect(rulerStep(0.6)).toBe(100);
  });

  it("spaces the numbers out on a canvas shown small", () => {
    expect(rulerStep(0.3)).toBe(200);
    expect(rulerStep(0.1)).toBe(500);
    expect(rulerStep(0.01)).toBe(1000);
  });
});

describe("resizeCanvasByDrag", () => {
  const start = { width: 1200, height: 630 };

  it("moves only the edge that is dragged", () => {
    expect(resizeCanvasByDrag(start, "right", { x: 50, y: 80 }, 0.5, 2000)).toEqual({
      width: 1300,
      height: 630,
    });
    expect(resizeCanvasByDrag(start, "bottom", { x: 50, y: 80 }, 0.5, 2000)).toEqual({
      width: 1200,
      height: 790,
    });
    expect(resizeCanvasByDrag(start, "corner", { x: 50, y: 80 }, 0.5, 2000)).toEqual({
      width: 1300,
      height: 790,
    });
  });

  it("stops the width where the canvas would leave the stage column", () => {
    expect(resizeCanvasByDrag(start, "right", { x: 400, y: 0 }, 0.5, 700).width).toBe(1400);
  });

  it("keeps the proportions on the corner with Shift, following the edge that moved further", () => {
    expect(resizeCanvasByDrag(start, "corner", { x: 100, y: 10 }, 0.5, 2000, true)).toEqual({
      width: 1400,
      height: 735,
    });
    expect(resizeCanvasByDrag(start, "corner", { x: 10, y: -63 }, 0.5, 2000, true)).toEqual({
      width: 960,
      height: 504,
    });
  });

  it("keeps the proportions when the stage column limits the width", () => {
    const size = resizeCanvasByDrag(start, "corner", { x: 400, y: 400 }, 0.5, 650, true);
    expect(size.width).toBe(1300);
    expect(size.height / size.width).toBeCloseTo(630 / 1200, 2);
  });

  it("ignores proportions on a single edge", () => {
    expect(resizeCanvasByDrag(start, "right", { x: 50, y: 0 }, 0.5, 2000, true)).toEqual({
      width: 1300,
      height: 630,
    });
  });

  it("keeps the size within the range the API accepts", () => {
    expect(resizeCanvasByDrag(start, "corner", { x: -5000, y: -5000 }, 0.5, 2000)).toEqual({
      width: SOCIAL_PREVIEW_MIN_EDGE_PX,
      height: SOCIAL_PREVIEW_MIN_EDGE_PX,
    });
  });
});
