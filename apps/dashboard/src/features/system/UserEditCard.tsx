import md5 from "blueimp-md5";
import { type ChangeEvent, type Reducer, type RefObject, useEffect, useReducer, useRef } from "react";
import SFPersonCropCircle from "sf-symbols-lib/monochrome/SFPersonCropCircle";
import SFPersonCropCircleFill from "sf-symbols-lib/monochrome/SFPersonCropCircleFill";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFTrayAndArrowUpFill from "sf-symbols-lib/monochrome/SFTrayAndArrowUpFill";

import type { AdminLocale, AdminUser } from "@lmaa/shared";
import { FormLabel, formInputClass } from "@lmaa/ui";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { LanguageToggle } from "@/components/ui/LanguageToggle.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";
import { useKeyboardSave } from "@/lib/useKeyboardSave.ts";

import {
  useAdminUsers,
  useDeleteUserAvatar,
  useSaveUserAvatar,
  useSetGravatarAvatar,
  useUpdateUser,
} from "./hooks/useAdminUsers.ts";

interface UserEditCardProps {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}

type EditableRole = "admin" | "moderator";

interface AvatarState {
  previewUrl: string | null;
  pendingFile: File | null;
  pendingGravatarUrl: string | null;
  deleted: boolean;
}

interface UserEditDraftState {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  locale: AdminLocale;
  role: EditableRole;
  logoutConfirm: boolean;
  avatar: AvatarState;
}

type UserEditField = "username" | "email" | "password" | "firstName" | "lastName";

type UserEditDraftAction =
  | { type: "setField"; field: UserEditField; value: string }
  | { type: "setLocale"; value: AdminLocale }
  | { type: "setRole"; value: EditableRole }
  | { type: "setLogoutConfirm"; value: boolean }
  | { type: "setAvatar"; value: AvatarState };

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

const EMPTY_AVATAR_STATE: AvatarState = {
  previewUrl: null,
  pendingFile: null,
  pendingGravatarUrl: null,
  deleted: false,
};

const userEditDraftReducer: Reducer<UserEditDraftState, UserEditDraftAction> = (state, action) => {
  switch (action.type) {
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setLocale":
      return { ...state, locale: action.value };
    case "setRole":
      return { ...state, role: action.value };
    case "setLogoutConfirm":
      return { ...state, logoutConfirm: action.value };
    case "setAvatar":
      return { ...state, avatar: action.value };
    default:
      return state;
  }
};

function createInitialDraft(user: AdminUser): UserEditDraftState {
  return {
    username: user.username,
    email: user.email,
    password: "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    locale: user.locale,
    role: user.role === "moderator" ? "moderator" : "admin",
    logoutConfirm: localStorage.getItem("logout-skip-confirm") !== "true",
    avatar: { ...EMPTY_AVATAR_STATE, previewUrl: user.avatarUrl ?? null },
  };
}

function UserAvatarEditor({
  currentAvatarUrl,
  displayUsername,
  fileInputRef,
  onFileChange,
  onRemoveAvatar,
  onUseGravatar,
  usersMessages,
}: {
  currentAvatarUrl: string | null;
  displayUsername: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onUseGravatar: () => void;
  usersMessages: DashboardMessages["users"];
}) {
  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-[var(--ds-border)] bg-[var(--ds-bg-elevated)] flex items-center justify-center">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt={displayUsername}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl font-bold text-[var(--ds-text-subtle)] select-none">
            {displayUsername[0]?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
        >
          <SFTrayAndArrowUpFill className="w-3.5 h-3.5 shrink-0" />
          {usersMessages.editCard.uploadImage}
        </button>
        <button
          type="button"
          onClick={onUseGravatar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
        >
          <SFPersonCropCircle className="w-3.5 h-3.5 shrink-0" />
          {usersMessages.editCard.useGravatar}
        </button>
        {currentAvatarUrl && (
          <button
            type="button"
            onClick={onRemoveAvatar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 transition-colors"
          >
            <SFTrashFill className="w-3.5 h-3.5 shrink-0" />
            {usersMessages.editCard.removeAvatar}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

function UserProfileFields({
  canChangeRole,
  draft,
  logoutConfirmLabel,
  me,
  onFieldChange,
  onLocaleChange,
  onLogoutConfirmChange,
  onRoleChange,
  userId,
  usersMessages,
}: {
  canChangeRole: boolean;
  draft: UserEditDraftState;
  logoutConfirmLabel: string;
  me: AdminUser | null;
  onFieldChange: (field: UserEditField, value: string) => void;
  onLocaleChange: (value: AdminLocale) => void;
  onLogoutConfirmChange: (value: boolean) => void;
  onRoleChange: (value: EditableRole) => void;
  userId: number;
  usersMessages: DashboardMessages["users"];
}) {
  return (
    <div className="flex-1 space-y-3 min-w-0">
      <div>
        <FormLabel htmlFor="user-edit-username">{usersMessages.editCard.username}</FormLabel>
        <input
          id="user-edit-username"
          type="text"
          value={draft.username}
          onChange={(e) => onFieldChange("username", e.target.value)}
          className={formInputClass}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-email">{usersMessages.editCard.email}</FormLabel>
        <input
          id="user-edit-email"
          type="email"
          value={draft.email}
          onChange={(e) => onFieldChange("email", e.target.value)}
          className={formInputClass}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-first-name">{usersMessages.editCard.firstName}</FormLabel>
        <input
          id="user-edit-first-name"
          type="text"
          value={draft.firstName}
          onChange={(e) => onFieldChange("firstName", e.target.value)}
          className={formInputClass}
        />
      </div>

      <div>
        <FormLabel htmlFor="user-edit-last-name">{usersMessages.editCard.lastName}</FormLabel>
        <input
          id="user-edit-last-name"
          type="text"
          value={draft.lastName}
          onChange={(e) => onFieldChange("lastName", e.target.value)}
          className={formInputClass}
        />
      </div>

      {canChangeRole && (
        <div>
          <FormLabel htmlFor="user-edit-role">{usersMessages.editCard.role}</FormLabel>
          <select
            id="user-edit-role"
            value={draft.role}
            onChange={(e) => onRoleChange(e.target.value as EditableRole)}
            className={formInputClass}
          >
            <option value="admin">{usersMessages.editCard.roleAdmin}</option>
            <option value="moderator">{usersMessages.editCard.roleModerator}</option>
          </select>
        </div>
      )}

      <div>
        <FormLabel htmlFor="user-edit-password">{usersMessages.editCard.password}</FormLabel>
        <input
          id="user-edit-password"
          type="password"
          value={draft.password}
          onChange={(e) => onFieldChange("password", e.target.value)}
          placeholder={usersMessages.editCard.passwordPlaceholder}
          className={formInputClass}
        />
      </div>

      {me?.id === userId && (
        <>
          <div>
            <FormLabel>{usersMessages.editCard.language}</FormLabel>
            <div className="inline-block">
              <LanguageToggle value={draft.locale} onChange={onLocaleChange} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none px-[5px] pt-1">
            <input
              type="checkbox"
              checked={draft.logoutConfirm}
              onChange={(e) => onLogoutConfirmChange(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--ds-text-muted)]">{logoutConfirmLabel}</span>
          </label>
        </>
      )}
    </div>
  );
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
    setAvatarState({ previewUrl: null, pendingFile: null, pendingGravatarUrl: null, deleted: true });
  }

  async function handleSave(close = true) {
    const profileChanges: {
      username?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      locale?: AdminLocale;
      role?: EditableRole;
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
          <SFPersonCropCircleFill className={dialogHeaderIconClass} />
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
          className="py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
        >
          {common.cancel}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-40"
        >
          <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
          {isPending ? common.saving : common.save}
        </button>
      </OverlayCard.Footer>

      <AlertDialog
        open={isError}
        title={usersMessages.editCard.errorSaving}
        message={error instanceof Error ? error.message : usersMessages.editCard.errorSaving}
        onClose={() => {
          updateUser.reset();
          saveAvatar.reset();
          setGravatar.reset();
          deleteAvatar.reset();
        }}
        buttonLabel={common.close}
      />
    </OverlayCard>
  );
}

/**
 * Modal card for editing one dashboard user.
 *
 * @param props - User id and close/save callbacks.
 * @returns User edit modal.
 */
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
          <SFPersonCropCircleFill className={dialogHeaderIconClass} />
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
