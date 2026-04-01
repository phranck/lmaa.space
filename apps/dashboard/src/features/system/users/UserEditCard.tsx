import { DownloadIcon, UserCircleIcon } from "@phosphor-icons/react";
import md5 from "blueimp-md5";
import { type ChangeEvent, useEffect, useReducer, useRef } from "react";

import type { AdminLocale, AdminUser } from "@lmaa/shared";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  useAdminUsers,
  useDeleteUserAvatar,
  useSaveUserAvatar,
  useSetGravatarAvatar,
  useUpdateUser,
} from "@/features/system/hooks/useAdminUsers.ts";
import {
  type AvatarState,
  createInitialDraft,
  userEditDraftReducer,
} from "@/features/system/users/user-edit-state.ts";
import { UserAvatarEditor } from "@/features/system/users/UserAvatarEditor.tsx";
import { UserProfileFields } from "@/features/system/users/UserProfileFields.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

interface UserEditCardProps {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}

interface UserEditCardFormProps {
  common: DashboardMessages["common"];
  logoutConfirmLabel: string;
  me: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
  refreshAuth: () => Promise<void>;
  savedPhase: ReturnType<typeof useSaveNotification>["phase"];
  showSaved: ReturnType<typeof useSaveNotification>["show"];
  user: AdminUser;
  usersMessages: DashboardMessages["users"];
}

function UserEditCardForm({
  common,
  logoutConfirmLabel,
  me,
  onClose,
  onSaved,
  refreshAuth,
  savedPhase,
  showSaved,
  user,
  usersMessages,
}: UserEditCardFormProps) {
  const savedLogoutConfirm = localStorage.getItem("logout-skip-confirm") !== "true";
  const [draft, dispatch] = useReducer(userEditDraftReducer, user, createInitialDraft);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const updateUser = useUpdateUser();
  const saveAvatar = useSaveUserAvatar();
  const setGravatar = useSetGravatarAvatar();
  const deleteAvatar = useDeleteUserAvatar();

  const isPending =
    updateUser.isPending || saveAvatar.isPending || setGravatar.isPending || deleteAvatar.isPending;
  const isError =
    updateUser.isError || saveAvatar.isError || setGravatar.isError || deleteAvatar.isError;
  const error = updateUser.error ?? saveAvatar.error ?? setGravatar.error ?? deleteAvatar.error;

  const canChangeRole = Boolean(me?.isOwner) && user.id !== me?.id && user.role !== "owner";
  const roleChanged =
    canChangeRole && draft.role !== (user.role === "moderator" ? "moderator" : "admin");
  const hasChanges =
    draft.username !== user.username ||
    draft.email !== user.email ||
    draft.password.trim() !== "" ||
    draft.firstName !== (user.firstName ?? "") ||
    draft.lastName !== (user.lastName ?? "") ||
    draft.locale !== user.locale ||
    roleChanged ||
    draft.avatar.pendingFile !== null ||
    draft.avatar.pendingGravatarUrl !== null ||
    draft.avatar.deleted ||
    (me?.id === user.id && draft.logoutConfirm !== savedLogoutConfirm);

  const canSave =
    hasChanges && draft.username.trim() !== "" && draft.email.trim() !== "" && !isPending;
  const currentAvatarUrl = draft.avatar.previewUrl;
  const displayUsername = draft.username || user.username;

  function setAvatarState(next: AvatarState) {
    if (previewObjectUrlRef.current && previewObjectUrlRef.current !== next.previewUrl) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    if (next.previewUrl?.startsWith("blob:")) {
      previewObjectUrlRef.current = next.previewUrl;
    }

    dispatch({ type: "setAvatar", value: next });
  }

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    },
    [],
  );

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarState({ previewUrl, pendingFile: file, pendingGravatarUrl: null, deleted: false });
    e.target.value = "";
  }

  function handleGravatar() {
    const hash = md5(draft.email.trim().toLowerCase());
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=256&d=mp`;
    setAvatarState({
      previewUrl: gravatarUrl,
      pendingFile: null,
      pendingGravatarUrl: gravatarUrl,
      deleted: false,
    });
  }

  function handleRemoveAvatar() {
    setAvatarState({
      previewUrl: null,
      pendingFile: null,
      pendingGravatarUrl: null,
      deleted: true,
    });
  }

  async function handleSave(close = true) {
    const profileChanges: {
      username?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      locale?: AdminLocale;
      role?: "admin" | "moderator";
    } = {};

    if (draft.username !== user.username) profileChanges.username = draft.username;
    if (draft.email !== user.email) profileChanges.email = draft.email;
    if (draft.password.trim()) profileChanges.password = draft.password;
    if (draft.firstName !== (user.firstName ?? "")) profileChanges.firstName = draft.firstName;
    if (draft.lastName !== (user.lastName ?? "")) profileChanges.lastName = draft.lastName;
    if (draft.locale !== user.locale) profileChanges.locale = draft.locale;
    if (roleChanged) profileChanges.role = draft.role;

    if (Object.keys(profileChanges).length > 0) {
      await updateUser.mutateAsync({ id: user.id, data: profileChanges });
    }

    if (draft.avatar.pendingFile) {
      await saveAvatar.mutateAsync({ id: user.id, file: draft.avatar.pendingFile });
    } else if (draft.avatar.pendingGravatarUrl) {
      await setGravatar.mutateAsync({ id: user.id, gravatarUrl: draft.avatar.pendingGravatarUrl });
    } else if (draft.avatar.deleted && user.avatarUrl) {
      await deleteAvatar.mutateAsync(user.id);
    }

    if (me?.id === user.id) {
      if (draft.logoutConfirm) {
        localStorage.removeItem("logout-skip-confirm");
      } else {
        localStorage.setItem("logout-skip-confirm", "true");
      }
      await refreshAuth();
    }

    if (close) {
      onSaved();
    } else {
      showSaved();
    }
  }

  useKeyboardSave(() => {
    if (hasChanges) void handleSave(false);
  });

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "users:edit-card-size", defaultWidth: 512 }}
      aria-label={usersMessages.editCard.title}
    >
      <OverlayCard.Header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCircleIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {usersMessages.editCard.title}
          </h2>
        </div>
        <SaveNotification phase={savedPhase} label={common.saved} />
      </OverlayCard.Header>

      <OverlayCard.Body>
        <div className="flex gap-6 items-start">
          <UserAvatarEditor
            currentAvatarUrl={currentAvatarUrl}
            displayUsername={displayUsername}
            fileInputRef={fileInputRef}
            onFileChange={handleFileSelect}
            onRemoveAvatar={handleRemoveAvatar}
            onUseGravatar={handleGravatar}
            usersMessages={usersMessages}
          />

          <UserProfileFields
            canChangeRole={canChangeRole}
            draft={draft}
            logoutConfirmLabel={logoutConfirmLabel}
            me={me}
            onFieldChange={(field, value) => dispatch({ type: "setField", field, value })}
            onLocaleChange={(value) => dispatch({ type: "setLocale", value })}
            onLogoutConfirmChange={(value) => dispatch({ type: "setLogoutConfirm", value })}
            onRoleChange={(value) => dispatch({ type: "setRole", value })}
            userId={user.id}
            usersMessages={usersMessages}
          />
        </div>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)]"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-40"
        >
          <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
          {isPending ? common.saving : common.save}
        </button>
      </OverlayCard.Footer>

      <AlertDialog
        open={isError}
        title={usersMessages.editCard.errorSaving}
        onClose={() => {
          updateUser.reset();
          saveAvatar.reset();
          setGravatar.reset();
          deleteAvatar.reset();
        }}
        buttonLabel={common.close}
      >
        {error instanceof Error ? error.message : usersMessages.editCard.errorSaving}
      </AlertDialog>
    </OverlayCard>
  );
}

export function UserEditCard({ userId, onClose, onSaved }: UserEditCardProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const usersMessages = messages.users;
  const { user: me, refresh } = useAuth();
  const { phase: savedPhase, show: showSaved } = useSaveNotification();
  const { data: users = [] } = useAdminUsers();

  const user = users.find((candidate) => candidate.id === userId);

  if (!user) {
    return (
      <OverlayCard
        open
        onClose={onClose}
        size={{ storageKey: "users:edit-card-size", defaultWidth: 512 }}
        aria-label={usersMessages.editCard.title}
      >
        <OverlayCard.Header className="flex items-center gap-3">
          <UserCircleIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {usersMessages.editCard.title}
          </h2>
        </OverlayCard.Header>
        <OverlayCard.Body>
          <p className="text-sm text-[var(--ds-text-muted)]">{common.loading}</p>
        </OverlayCard.Body>
      </OverlayCard>
    );
  }

  const userKey = [
    user.id,
    user.username,
    user.email,
    user.firstName ?? "",
    user.lastName ?? "",
    user.avatarUrl ?? "",
    user.role,
  ].join(":");

  return (
    <UserEditCardForm
      key={userKey}
      common={common}
      logoutConfirmLabel={messages.layout.sidebar.logoutConfirmLabel}
      me={me}
      onClose={onClose}
      onSaved={onSaved}
      refreshAuth={refresh}
      savedPhase={savedPhase}
      showSaved={showSaved}
      user={user}
      usersMessages={usersMessages}
    />
  );
}
