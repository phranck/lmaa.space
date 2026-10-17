import type { CSSProperties } from "react";

import iconUrl from "@lmaa/ui/marks/lmaa-icon.svg?url";

/**
 * The drawing as a mask over a box filled with the current text color. The
 * file draws in `currentColor`, which an image cannot inherit, so the mask is
 * what gives it a color at all.
 */
const ICON_MASK: CSSProperties = {
  WebkitMask: `url("${iconUrl}") center / contain no-repeat`,
  mask: `url("${iconUrl}") center / contain no-repeat`,
};

/**
 * Props of {@link LmaaIcon}.
 *
 * @property label - The accessible name, read in place of the drawing.
 * @property className - Size classes. The icon is square, so one size such
 *   as `size-8` sets both edges.
 */
interface LmaaIconProps {
  label: string;
  className?: string;
}

/**
 * The LMAA icon: the llama in the L, cut out of a rounded square, in the
 * brand's gold. It is the drawing the website shows in its header, imported
 * from `@lmaa/ui`, so the two cannot drift apart.
 *
 * @returns An element with the role of an image, named by `label`.
 */
export function LmaaIcon({ label, className = "" }: LmaaIconProps) {
  return (
    <span
      role="img"
      aria-label={label}
      style={ICON_MASK}
      className={`block bg-current text-[var(--ds-accent)] ${className}`}
    />
  );
}
