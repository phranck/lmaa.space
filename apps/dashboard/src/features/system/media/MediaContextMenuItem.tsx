import type { ReactNode } from "react";

const itemClass =
  "flex w-full items-center gap-2 px-3 text-left text-xs transition-colors focus:bg-[var(--ds-control-hover-bg)] focus:outline-none hover:bg-[var(--ds-control-hover-bg)] h-[var(--ds-control-h-menu-item)]";

interface MediaContextMenuItemProps {
  destructive?: boolean;
  icon: ReactNode;
  label: string;
  onClose: () => void;
  onSelect: () => void;
}

export function MediaContextMenuItem({
  destructive,
  icon,
  label,
  onClose,
  onSelect,
}: MediaContextMenuItemProps) {
  return (
    <button
      type="button"
      data-menu-item="true"
      tabIndex={-1}
      className={`${itemClass} ${destructive ? "text-[var(--ds-danger-text)]" : "text-[var(--ds-text)]"}`}
      onClick={() => {
        onSelect();
        onClose();
      }}
      onMouseEnter={(event) => event.currentTarget.focus()}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}
