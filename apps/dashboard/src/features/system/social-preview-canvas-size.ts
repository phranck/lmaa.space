import { SOCIAL_PREVIEW_MAX_EDGE_PX } from "@lmaa/contracts";

/** The shortest edge a social preview image may have, in pixels, as the API accepts it. */
export const SOCIAL_PREVIEW_MIN_EDGE_PX = 1;

/**
 * Share of the stage's width left free to the right of the canvas.
 *
 * The canvas is resized by dragging its right edge, and an edge that already
 * touches the end of its space has nowhere to be dragged to.
 */
const DRAG_ROOM_SHARE = 0.12;

/**
 * Share of the window's height the canvas may take.
 *
 * A tall format, such as a story, would otherwise fill the window at the width
 * it is given and push the attribute bar and the preview out of view.
 */
const STAGE_MAX_HEIGHT_SHARE = 0.7;

/** The distances between two numbered marks on a ruler, in canvas pixels, from fine to coarse. */
const RULER_STEPS = [100, 200, 500, 1000] as const;

/** The least room a ruler's number needs on screen, in pixels, before the next one may follow. */
const RULER_LABEL_ROOM_PX = 40;

/** Width and height in pixels, of the canvas or of the space shown around it. */
export interface CanvasSize {
  width: number;
  height: number;
}

/** The edge of the canvas a drag holds, where `corner` moves the right and the bottom edge together. */
export type CanvasEdge = "right" | "bottom" | "corner";

/**
 * Brings a typed or dragged edge length into the range the API accepts.
 *
 * @param value - Edge length in pixels, possibly fractional or out of range.
 * @returns Whole pixels from {@link SOCIAL_PREVIEW_MIN_EDGE_PX} to
 *   `SOCIAL_PREVIEW_MAX_EDGE_PX`. Anything that is not a number becomes the
 *   minimum.
 */
export function clampCanvasEdge(value: number): number {
  if (!Number.isFinite(value)) return SOCIAL_PREVIEW_MIN_EDGE_PX;
  return Math.min(
    SOCIAL_PREVIEW_MAX_EDGE_PX,
    Math.max(SOCIAL_PREVIEW_MIN_EDGE_PX, Math.round(value)),
  );
}

/**
 * The scale the stage shows the canvas at when nothing is being dragged.
 *
 * The canvas fits the stage's width less the room kept for dragging, and at
 * most a share of the window's height. It is never enlarged beyond its own
 * pixels, so a small image shows at its real size.
 *
 * @param canvas - The canvas size in pixels.
 * @param space - The width the stage column offers and the window's height,
 *   both in screen pixels.
 * @returns Screen pixels per canvas pixel, at most 1.
 */
export function fitStageScale(canvas: CanvasSize, space: CanvasSize): number {
  const byWidth = (space.width * (1 - DRAG_ROOM_SHARE)) / canvas.width;
  const byHeight = (space.height * STAGE_MAX_HEIGHT_SHARE) / canvas.height;
  return Math.max(0, Math.min(1, byWidth, byHeight));
}

/**
 * The distance between two numbered marks on the stage's rulers.
 *
 * A large canvas shown small would otherwise print its numbers on top of each
 * other, so the step grows until every number has room.
 *
 * @param scale - Screen pixels per canvas pixel.
 * @returns The step in canvas pixels. The ruler draws four ticks per step.
 */
export function rulerStep(scale: number): number {
  return (
    RULER_STEPS.find((step) => step * scale >= RULER_LABEL_ROOM_PX) ?? Math.max(...RULER_STEPS)
  );
}

/**
 * The canvas size a drag on one of its edges leads to.
 *
 * The scale stays as it was when the drag began, so the dragged edge follows
 * the pointer. The width stops where the canvas would leave the stage column,
 * because beyond it the layer list stands.
 *
 * @param start - The canvas size when the drag began.
 * @param edge - The edge being dragged.
 * @param delta - How far the pointer moved since the drag began, in screen
 *   pixels.
 * @param scale - Screen pixels per canvas pixel during the drag.
 * @param spaceWidth - The width of the stage column, in screen pixels.
 * @param proportional - Keeps the proportions of `start` while the corner is
 *   dragged, following whichever edge moved further. Ignored for a single edge.
 * @returns The new size, within the range the API accepts.
 */
export function resizeCanvasByDrag(
  start: CanvasSize,
  edge: CanvasEdge,
  delta: { x: number; y: number },
  scale: number,
  spaceWidth: number,
  proportional = false,
): CanvasSize {
  const widestWidth = Math.min(
    SOCIAL_PREVIEW_MAX_EDGE_PX,
    Math.max(start.width, Math.floor(spaceWidth / scale)),
  );

  if (edge === "corner" && proportional) {
    const widthFactor = (start.width + delta.x / scale) / start.width;
    const heightFactor = (start.height + delta.y / scale) / start.height;
    const wanted =
      Math.abs(widthFactor - 1) >= Math.abs(heightFactor - 1) ? widthFactor : heightFactor;
    // The factor is held inside every limit at once, because clamping one
    // edge on its own would bend the proportions it is meant to keep.
    const smallest = Math.max(
      SOCIAL_PREVIEW_MIN_EDGE_PX / start.width,
      SOCIAL_PREVIEW_MIN_EDGE_PX / start.height,
    );
    const largest = Math.min(widestWidth / start.width, SOCIAL_PREVIEW_MAX_EDGE_PX / start.height);
    const factor = Math.min(largest, Math.max(smallest, wanted));
    return {
      width: clampCanvasEdge(start.width * factor),
      height: clampCanvasEdge(start.height * factor),
    };
  }

  const width =
    edge === "bottom"
      ? start.width
      : Math.min(clampCanvasEdge(start.width + delta.x / scale), widestWidth);
  const height = edge === "right" ? start.height : clampCanvasEdge(start.height + delta.y / scale);
  return { width, height };
}
