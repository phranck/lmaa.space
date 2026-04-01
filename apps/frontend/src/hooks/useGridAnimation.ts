import { useAutoAnimate } from "@formkit/auto-animate/react";

/**
 * Standard grid animation for shop/category grids.
 *
 * Wraps `useAutoAnimate` with consistent duration and easing.
 * Returns a ref callback to attach to the grid container.
 */
export function useGridAnimation() {
  const [ref] = useAutoAnimate({ duration: 250, easing: "ease-out" });
  return ref;
}
