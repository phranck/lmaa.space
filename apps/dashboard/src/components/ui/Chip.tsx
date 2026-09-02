import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge.tsx";

interface ChipProps {
  /** Rendered before the label, at a size the badge height already accounts for. */
  icon?: ReactNode;
  /** Positioning and flex behaviour of the chip within its container. */
  className?: string;
  children: ReactNode;
}

/**
 * A pill naming a thing, such as a category, a platform, a scope or a kind.
 *
 * @param icon - Shown before the label.
 * @param className - Added to the shared shape, for placement only.
 * @param children - The label.
 * @returns The chip.
 *
 * @remarks
 * A chip and a status badge share the shape and differ in what they say. A
 * badge answers how a row is doing and takes a colour from the verdict family
 * for it; a chip only names something and stays out of that family, so a reader
 * scanning a table for colour is never stopped by a category name.
 *
 * It carries no colour prop for that reason. Every chip in the dashboard is the
 * same chip, and a per-call colour would put the question back at each call
 * site where it was answered six different ways before.
 */
export function Chip({ icon, className = "", children }: ChipProps) {
  return (
    <Badge
      colorClass="bg-[var(--ds-chip-bg)] text-[var(--ds-chip-text)]"
      icon={icon}
      className={className}
    >
      {children}
    </Badge>
  );
}
