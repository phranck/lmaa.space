import { UserAvatar } from "@/features/users/UserAvatar.tsx";
import { SFRectanglePortraitAndArrowRightFill } from "sf-symbols-lib/monochrome";

import type { AdminRole } from "@lmaa/shared";

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Admin",
  moderator: "Moderator",
};

interface SidebarFooterProps {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: AdminRole;
  avatarUrl?: string | null;
  onLogout: () => void;
}

export function SidebarFooter({ username, firstName, lastName, role, avatarUrl, onLogout }: SidebarFooterProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || username;
  return (
    <div className="px-3 py-4 border-t border-[var(--ds-border)] shrink-0">
      <div className="flex items-center gap-3 px-3 py-2 mb-1">
        {username && (
          <UserAvatar username={username} avatarUrl={avatarUrl} size="md" className="shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--ds-text)] truncate">{displayName}</p>
          {role && <p className="text-xs text-[var(--ds-text-muted)] truncate">{ROLE_LABEL[role]}</p>}
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
