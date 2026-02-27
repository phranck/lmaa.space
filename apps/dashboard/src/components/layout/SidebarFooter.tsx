import { useI18n } from "@/context/I18nContext.tsx";
import { UserAvatar } from "@/features/users/UserAvatar.tsx";
import { SFRectanglePortraitAndArrowRightFill, SFSquareAndPencil } from "sf-symbols-lib/monochrome";

import type { AdminRole } from "@lmaa/shared";

interface SidebarFooterProps {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: AdminRole;
  avatarUrl?: string | null;
  onLogout: () => void;
  onEditProfile?: () => void;
}

/**
 * Footer section in sidebar with profile/menu actions.
 *
 * @param props - Auth/profile and action handlers.
 * @returns Sidebar footer component.
 */
export function SidebarFooter({
  username,
  firstName,
  lastName,
  role,
  avatarUrl,
  onLogout,
  onEditProfile,
}: SidebarFooterProps) {
  const { messages } = useI18n();
  const sidebarMessages = messages.layout.sidebar;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || username;
  const roleLabel: Record<AdminRole, string> = {
    owner: sidebarMessages.roles.owner,
    admin: sidebarMessages.roles.admin,
    moderator: sidebarMessages.roles.moderator,
  };

  return (
    <div className="px-3 py-4 border-t border-[var(--ds-border)] shrink-0">
      <div className="flex items-center gap-3 px-3 py-2 mb-1">
        {username && (
          <UserAvatar username={username} avatarUrl={avatarUrl} size="md" className="shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--ds-text)] truncate">{displayName}</p>
          {role && (
            <p className="text-xs text-[var(--ds-text-muted)] truncate">{roleLabel[role]}</p>
          )}
        </div>
        {onEditProfile && (
          <button
            type="button"
            onClick={onEditProfile}
            title={sidebarMessages.editProfile}
            className="w-7 h-7 flex items-center justify-center rounded-control border border-[var(--ds-border)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]  shrink-0"
          >
            <SFSquareAndPencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-control text-sm text-[var(--ds-text-muted)] hover:bg-[var(--ds-danger-bg)] hover:text-[var(--ds-danger-text)] "
      >
        <SFRectanglePortraitAndArrowRightFill className="w-4 h-4 shrink-0" />
        {sidebarMessages.logout}
      </button>
    </div>
  );
}
