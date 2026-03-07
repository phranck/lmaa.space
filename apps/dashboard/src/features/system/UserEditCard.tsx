import md5 from "blueimp-md5";
import { useEffect, useRef, useState } from "react";
import SFAt from "sf-symbols-lib/monochrome/SFAt";
import SFKey from "sf-symbols-lib/monochrome/SFKey";
import SFPencil from "sf-symbols-lib/monochrome/SFPencil";
import SFPerson from "sf-symbols-lib/monochrome/SFPerson";
import SFPersonCropCircle from "sf-symbols-lib/monochrome/SFPersonCropCircle";
import SFSquareAndArrowDownFill from "sf-symbols-lib/monochrome/SFSquareAndArrowDownFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";
import SFTrayAndArrowUpFill from "sf-symbols-lib/monochrome/SFTrayAndArrowUpFill";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
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

interface AvatarState {
  previewUrl: string | null;
  pendingFile: File | null;
  pendingGravatarUrl: string | null;
  deleted: boolean;
}

const EMPTY_AVATAR_STATE: AvatarState = {
  previewUrl: null,
  pendingFile: null,
  pendingGravatarUrl: null,
  deleted: false,
};

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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"admin" | "moderator">("admin");
  const [avatar, setAvatar] = useState<AvatarState>(EMPTY_AVATAR_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(
    () => localStorage.getItem("logout-skip-confirm") !== "true",
  );

  const { data: users = [] } = useAdminUsers();
  const user = users.find((u) => u.id === userId);

  const updateUser = useUpdateUser();
  const saveAvatar = useSaveUserAvatar();
  const setGravatar = useSetGravatarAvatar();
  const deleteAvatar = useDeleteUserAvatar();

  const isPending =
    updateUser.isPending || saveAvatar.isPending || setGravatar.isPending || deleteAvatar.isPending;

  const isError =
    updateUser.isError || saveAvatar.isError || setGravatar.isError || deleteAvatar.isError;

  const error = updateUser.error ?? saveAvatar.error ?? setGravatar.error ?? deleteAvatar.error;

  function setAvatarState(next: AvatarState) {
    if (previewObjectUrlRef.current && previewObjectUrlRef.current !== next.previewUrl) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    if (next.previewUrl?.startsWith("blob:")) {
      previewObjectUrlRef.current = next.previewUrl;
    }

    setAvatar(next);
  }

  // Populate form when user data arrives
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setRole(user.role === "moderator" ? "moderator" : "admin");
      setAvatarState({ ...EMPTY_AVATAR_STATE, previewUrl: user.avatarUrl ?? null });
    }
  }, [user]);

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    },
    [],
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarState({ previewUrl, pendingFile: file, pendingGravatarUrl: null, deleted: false });
    e.target.value = "";
  }

  function handleGravatar() {
    const hash = md5(email.trim().toLowerCase());
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

  const canChangeRole = me?.isOwner && userId !== me?.id && user?.role !== "owner";
  const roleChanged = canChangeRole && role !== (user?.role ?? "admin");

  async function handleSave(close = true) {
    if (!user) return;

    // 1. Update profile fields if changed
    const profileChanges: {
      username?: string;
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: "admin" | "moderator";
    } = {};
    if (username !== user.username) profileChanges.username = username;
    if (email !== user.email) profileChanges.email = email;
    if (password.trim()) profileChanges.password = password;
    if (firstName !== (user.firstName ?? "")) profileChanges.firstName = firstName;
    if (lastName !== (user.lastName ?? "")) profileChanges.lastName = lastName;
    if (roleChanged) profileChanges.role = role;

    if (Object.keys(profileChanges).length > 0) {
      await updateUser.mutateAsync({ id: userId, data: profileChanges });
    }

    // 2. Handle avatar changes
    if (avatar.pendingFile) {
      await saveAvatar.mutateAsync({ id: userId, file: avatar.pendingFile });
    } else if (avatar.pendingGravatarUrl) {
      await setGravatar.mutateAsync({ id: userId, gravatarUrl: avatar.pendingGravatarUrl });
    } else if (avatar.deleted && user.avatarUrl) {
      await deleteAvatar.mutateAsync(userId);
    }

    if (me?.id === userId) {
      if (logoutConfirm) {
        localStorage.removeItem("logout-skip-confirm");
      } else {
        localStorage.setItem("logout-skip-confirm", "true");
      }
      await refresh();
    }

    if (close) {
      onSaved();
    } else {
      showSaved();
    }
  }

  useKeyboardSave(() => {
    if (hasChanges) handleSave(false);
  });

  const currentAvatarUrl = avatar.previewUrl;
  const displayUsername = username || (user?.username ?? "");
  const savedLogoutConfirm = localStorage.getItem("logout-skip-confirm") !== "true";
  const hasChanges =
    username !== (user?.username ?? "") ||
    email !== (user?.email ?? "") ||
    password.trim() !== "" ||
    firstName !== (user?.firstName ?? "") ||
    lastName !== (user?.lastName ?? "") ||
    roleChanged ||
    avatar.pendingFile !== null ||
    avatar.pendingGravatarUrl !== null ||
    avatar.deleted ||
    (me?.id === userId && logoutConfirm !== savedLogoutConfirm);

  const canSave = hasChanges && username.trim() !== "" && email.trim() !== "" && !isPending;

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{ storageKey: "users:edit-card-size", defaultWidth: 512 }}
      aria-label={usersMessages.editCard.title}
    >
      <OverlayCard.Header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SFPencil className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {usersMessages.editCard.title}
          </h2>
        </div>
        <SaveNotification phase={savedPhase} label={common.saved} />
      </OverlayCard.Header>

      <OverlayCard.Body>
        <div className="flex gap-6">
          {/* Left: Avatar */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            {/* Avatar preview */}
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

            {/* Avatar actions */}
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
                onClick={handleGravatar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
              >
                <SFPersonCropCircle className="w-3.5 h-3.5 shrink-0" />
                {usersMessages.editCard.useGravatar}
              </button>
              {currentAvatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
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
              onChange={handleFileSelect}
            />
          </div>

          {/* Right: Form fields */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Username */}
            <div>
              <label
                htmlFor="user-edit-username"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                <SFPencil className="w-3 h-3" />
                {usersMessages.editCard.username}
              </label>
              <input
                id="user-edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="user-edit-email"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                <SFAt className="w-3 h-3" />
                {usersMessages.editCard.email}
              </label>
              <input
                id="user-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
              />
            </div>

            {/* First name */}
            <div>
              <label
                htmlFor="user-edit-first-name"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                <SFPerson className="w-3 h-3" />
                {usersMessages.editCard.firstName}
              </label>
              <input
                id="user-edit-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
              />
            </div>

            {/* Last name */}
            <div>
              <label
                htmlFor="user-edit-last-name"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                <SFPerson className="w-3 h-3" />
                {usersMessages.editCard.lastName}
              </label>
              <input
                id="user-edit-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
              />
            </div>

            {/* Role (only for owner editing someone else) */}
            {canChangeRole && (
              <div>
                <label
                  htmlFor="user-edit-role"
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {usersMessages.editCard.role}
                </label>
                <select
                  id="user-edit-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "moderator")}
                  className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
                >
                  <option value="admin">{usersMessages.editCard.roleAdmin}</option>
                  <option value="moderator">{usersMessages.editCard.roleModerator}</option>
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <label
                htmlFor="user-edit-password"
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1"
              >
                <SFKey className="w-3 h-3" />
                {usersMessages.editCard.password}
              </label>
              <input
                id="user-edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={usersMessages.editCard.passwordPlaceholder}
                className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
              />
            </div>

            {/* Logout confirmation (own profile only) */}
            {me?.id === userId && (
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={logoutConfirm}
                  onChange={(e) => setLogoutConfirm(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--color-primary)]"
                />
                <span className="text-xs text-[var(--ds-text-muted)]">
                  {messages.layout.sidebar.logoutConfirmLabel}
                </span>
              </label>
            )}
          </div>
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
          onClick={() => handleSave()}
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
