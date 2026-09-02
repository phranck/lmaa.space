import type { ReactNode } from "react";

/**
 * The shape every badge shares.
 *
 * @remarks
 * The height is stated rather than left to the contents, because a badge
 * carrying an icon is otherwise taller than one carrying only a word, and
 * badges sit next to each other in a row where that difference is the first
 * thing a reader sees.
 */
const badgeShapeClass =
  "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium leading-none";

/**
 * The grey a status badge takes where the state has no colour of its own.
 *
 * @remarks
 * Named here rather than written at each call site, because the same grey
 * reports "not named on the site", "run out" and "this row is you" across four
 * tables. It stands beside the coloured verdicts in `VERDICT_COLORS` and comes
 * from the same badge token family, so grey reads as one of the answers rather
 * than as the absence of one.
 */
export const badgeNeutralClass =
  "bg-[var(--ds-badge-neutral-bg)] text-[var(--ds-badge-neutral-text)]";

interface BadgeProps {
  /** Background and text colour, as utility classes reading design tokens. */
  colorClass: string;
  /** Rendered before the label, at a size the badge height already accounts for. */
  icon?: ReactNode;
  /** Positioning and flex behaviour of the badge within its container. */
  className?: string;
  children: ReactNode;
}

/**
 * A pill carrying a short label, and optionally an icon before it.
 *
 * @param colorClass - Background and text colour of this badge.
 * @param icon - Shown before the label.
 * @param className - Added to the shared shape, for placement only.
 * @param children - The label.
 * @returns The badge.
 */
export function Badge({ colorClass, icon, className = "", children }: BadgeProps) {
  return (
    <span className={`${badgeShapeClass} ${colorClass} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
