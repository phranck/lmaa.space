import type { ReactNode } from "react";

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Generic bottom toolbar / legend bar used across dashboard screens.
 */
export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={[
        "shrink-0 -mx-3 -mb-3 min-h-14 flex items-center gap-4 px-4 py-2.5 border-t border-[var(--ds-border)] bg-[var(--ds-surface)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
