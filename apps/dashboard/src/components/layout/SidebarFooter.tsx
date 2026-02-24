import { UserAvatar } from "@/features/users/UserAvatar.tsx";
import { SFRectanglePortraitAndArrowRightFill } from "sf-symbols-lib/monochrome";

interface SidebarFooterProps {
  username?: string;
  email?: string;
  avatarUrl?: string | null;
  onLogout: () => void;
}

export function SidebarFooter({ username, email, avatarUrl, onLogout }: SidebarFooterProps) {
  return (
    <div className="px-3 py-4 border-t border-[var(--ds-border)] shrink-0">
      <div className="flex items-center gap-3 px-3 py-2 mb-1">
        {username && (
          <UserAvatar username={username} avatarUrl={avatarUrl} size="md" className="shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--ds-text)] truncate">{username}</p>
          <p className="text-xs text-[var(--ds-text-muted)] truncate">{email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-control text-sm text-[var(--ds-text-muted)] hover:bg-[var(--ds-danger-bg)] hover:text-[var(--ds-danger-text)] transition-colors"
      >
        <SFRectanglePortraitAndArrowRightFill className="w-4 h-4 shrink-0" />
        Abmelden
      </button>
    </div>
  );
}
