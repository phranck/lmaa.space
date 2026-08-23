import { SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useState } from "react";

import type { AdminRole } from "@lmaa/shared";

import { Avatar } from "@/components/ui/Avatar.tsx";
import { CancelActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

const SKIP_KEY = "logout-skip-confirm";

interface FooterUserInfoProps {
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: AdminRole;
  avatarUrl?: string | null;
  onLogout: () => void;
  onEditProfile?: () => void;
}

export function FooterUserInfo({
  username,
  firstName,
  lastName,
  role,
  avatarUrl,
  onLogout,
  onEditProfile,
}: FooterUserInfoProps) {
  const { messages } = useI18n();
  const s = messages.layout.sidebar;
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || username;
  const roleLabel: Record<AdminRole, string> = {
    owner: s.roles.owner,
    admin: s.roles.admin,
    moderator: s.roles.moderator,
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [skipNext, setSkipNext] = useState(false);

  function handleLogoutClick() {
    if (localStorage.getItem(SKIP_KEY) === "true") {
      onLogout();
    } else {
      setSkipNext(false);
      setConfirmOpen(true);
    }
  }

  function handleConfirm() {
    if (skipNext) localStorage.setItem(SKIP_KEY, "true");
    setConfirmOpen(false);
    onLogout();
  }

  const btnClass =
    "size-8 flex items-center justify-center rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)] shrink-0";

  return (
    <>
      <div className="w-full flex items-center gap-3">
        {username && (
          <Avatar name={username} imageUrl={avatarUrl} size="sm" className="shrink-0" />
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
            aria-label={s.editProfile}
            className={btnClass}
          >
            <UserCircleIcon weight="duotone" className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={handleLogoutClick}
          aria-label={s.logout}
          className={btnClass}
        >
          <SignOutIcon weight="duotone" className="size-3.5" />
        </button>
      </div>

      <Dialog
        open={confirmOpen}
        title={s.logoutConfirmTitle}
        titleIcon={<SignOutIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="px-6 py-3 space-y-3">
          <p className="text-sm text-[var(--ds-text-muted)]">{s.logoutConfirmDescription}</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipNext}
              onChange={(e) => setSkipNext(e.target.checked)}
              className="size-4 rounded accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--ds-text-muted)]">{s.logoutSkipConfirm}</span>
          </label>
        </div>
        <Dialog.Footer>
          <CancelActionButton
            label={messages.common.cancel}
            onClick={() => setConfirmOpen(false)}
          />
          <DashboardButton
            leadingIcon={<SignOutIcon weight="duotone" className="size-3.5" />}
            onClick={handleConfirm}
            size="action"
            variant="primary"
          >
            {s.logoutConfirmAction}
          </DashboardButton>
        </Dialog.Footer>
      </Dialog>
    </>
  );
}

export function SidebarFooter(props: FooterUserInfoProps) {
  return (
    <div className="shrink-0 min-h-14 border-t border-[var(--ds-border)] px-5 flex items-center">
      <FooterUserInfo {...props} />
    </div>
  );
}
