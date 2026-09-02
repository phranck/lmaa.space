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
 * The colours a status badge can take, named by what each one answers.
 *
 * @remarks
 * A feature maps its own states onto these rather than naming a colour, which
 * is what `VERDICT_COLORS`, `STATUS_COLORS` and `USER_ROLE_COLORS` do. The
 * mapping belongs beside the states it describes; the colour belongs here, so
 * green means the same thing in every table that uses it.
 *
 * Every entry reads a `--ds-badge-*` token. A surface token draws the badge in
 * the colour of whatever stands behind it, and a raw utility colour puts a
 * value outside the design system where nothing can move it.
 */
export const BADGE_TONES = {
  /** Waiting on somebody, and nothing has gone wrong. */
  pending: "bg-[var(--ds-badge-pending-bg)] text-[var(--ds-badge-pending-text)]",
  /** In force, still running, or affirmed. */
  success: "bg-[var(--ds-badge-success-bg)] text-[var(--ds-badge-success-text)]",
  /** Gone, failed, or removed. */
  danger: "bg-[var(--ds-badge-danger-bg)] text-[var(--ds-badge-danger-text)]",
  /** Turned down, which is a decision against something rather than its removal. */
  rejected: "bg-[var(--ds-badge-rejected-bg)] text-[var(--ds-badge-rejected-text)]",
  /** Worth knowing, and neither good nor bad. */
  info: "bg-[var(--ds-badge-info-bg)] text-[var(--ds-badge-info-text)]",
  /** Wants a person to look at it. */
  review: "bg-[var(--ds-badge-review-bg)] text-[var(--ds-badge-review-text)]",
  /**
   * Deliberately no answer either way.
   *
   * Grey with a little saturation rather than none, so it reads as one of the
   * answers above rather than as the absence of one.
   */
  neutral: "bg-[var(--ds-badge-neutral-bg)] text-[var(--ds-badge-neutral-text)]",
} as const satisfies Record<string, string>;

/** Name of one badge colour. */
export type BadgeTone = keyof typeof BADGE_TONES;

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
