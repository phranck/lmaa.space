import { LuLogOut } from "react-icons/lu";

interface SidebarFooterProps {
  username?: string;
  email?: string;
  onLogout: () => void;
}

export function SidebarFooter({ username, email, onLogout }: SidebarFooterProps) {
  return (
    <div className="px-3 py-4 border-t border-[var(--ds-border)] shrink-0">
      <div className="px-3 py-2 mb-1">
        <p className="text-xs font-medium text-[var(--ds-text)] truncate">{username}</p>
        <p className="text-xs text-[var(--ds-text-muted)] truncate">{email}</p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-control text-sm text-[var(--ds-text-muted)] hover:bg-[var(--ds-danger-bg)] hover:text-[var(--ds-danger-text)] transition-colors"
      >
        <LuLogOut size={16} className="shrink-0" />
        Abmelden
      </button>
    </div>
  );
}
