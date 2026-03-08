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
        "flex items-center gap-4 px-4 py-2 border-t border-[var(--ds-border)] bg-[var(--ds-surface)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
