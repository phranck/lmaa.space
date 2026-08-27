import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useEffect } from "react";

/**
 * Standard grid animation for shop and category grids.
 *
 * Wraps `useAutoAnimate` with consistent duration and easing.
 *
 * The animation exists for one thing: when a filter changes, the cards that
 * stay should travel to their new places rather than jump. It reacts to any
 * change in the list, though, so anything else appearing between the cards
 * moves every one of them at once. A grid that holds something arriving on its
 * own therefore starts with the animation off and turns it on once the reader
 * actually filters.
 *
 * @param enabled - Whether the grid animates. Grids holding nothing but their
 *   own items can leave this alone.
 * @returns The ref for the container.
 */
export function useGridAnimation(enabled = true) {
  const [ref, enable] = useAutoAnimate({ duration: 250, easing: "ease-out" });

  useEffect(() => {
    enable(enabled);
  }, [enable, enabled]);

  return ref;
}
