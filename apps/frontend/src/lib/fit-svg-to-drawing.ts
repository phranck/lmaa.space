/** Frames allowed for a drawing to appear before the trim gives up. */
export const TRIM_ATTEMPTS = 30;

/**
 * Makes the drawn code fill its box.
 *
 * The renderer fits whole pixels per module, so a canvas that is not an exact
 * multiple of the module count keeps the remainder as padding and centers the
 * code inside it. That padding reads as a margin nobody asked for, and it
 * changes with the data, because the amount decides how many modules there are.
 *
 * The fix crops rather than deletes, because the modules are drawn as clipping
 * masks that a full-size rectangle is poured through. Deleting anything there
 * takes the code with it.
 *
 * What is measured are the three finder patterns, the squares a scanner looks
 * for. Every QR code carries them flush with its corners, so their extent is
 * the code's extent, and that extent becomes the `viewBox`.
 *
 * @param node - The element the renderer drew into.
 * @returns `true` once a drawing was found and cropped, `false` while there is
 *   nothing to crop yet.
 */
export function fitSvgToDrawing(node: HTMLElement): boolean {
  const svg = node.querySelector("svg");
  if (!svg) return false;

  const canvas = Number(svg.getAttribute("width"));
  if (!canvas) return false;

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const shape of Array.from(svg.querySelectorAll<SVGRectElement>(":scope > rect"))) {
    const width = shape.width.baseVal.value;
    const height = shape.height.baseVal.value;
    // The layers that carry the modules span the whole canvas and say nothing
    // about where the code sits. The finder patterns are the ones that do.
    if (width >= canvas || height >= canvas) continue;

    const x = shape.x.baseVal.value;
    const y = shape.y.baseVal.value;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  }

  if (!Number.isFinite(left) || right <= left || bottom <= top) return false;

  svg.setAttribute("viewBox", `${left} ${top} ${right - left} ${bottom - top}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return true;
}
