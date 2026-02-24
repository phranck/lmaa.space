import md5 from "blueimp-md5";
import { useEffect, useRef, useState } from "react";
import {
  SFAt,
  SFCamera,
  SFKey,
  SFPencil,
  SFPersonCropCircle,
  SFTrash,
  SFXmark,
} from "sf-symbols-lib/monochrome";
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

export function UserEditCard({ userId, onClose, onSaved }: UserEditCardProps) {
  const [closing, setClosing] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<AvatarState>(EMPTY_AVATAR_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useAdminUsers();
  const user = users.find((u) => u.id === userId);

  const updateUser = useUpdateUser();
  const saveAvatar = useSaveUserAvatar();
  const setGravatar = useSetGravatarAvatar();
  const deleteAvatar = useDeleteUserAvatar();

  const isPending =
    updateUser.isPending ||
    saveAvatar.isPending ||
    setGravatar.isPending ||
    deleteAvatar.isPending;

  const isError =
    updateUser.isError || saveAvatar.isError || setGravatar.isError || deleteAvatar.isError;

  const error = updateUser.error ?? saveAvatar.error ?? setGravatar.error ?? deleteAvatar.error;

  // Populate form when user data arrives
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setAvatar({ ...EMPTY_AVATAR_STATE, previewUrl: user.avatarUrl ?? null });
    }
  }, [user?.id]);

  // ESC key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setClosing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatar({ previewUrl, pendingFile: file, pendingGravatarUrl: null, deleted: false });
    e.target.value = "";
  }

  function handleGravatar() {
    const hash = md5(email.trim().toLowerCase());
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=256&d=mp`;
    setAvatar({ previewUrl: gravatarUrl, pendingFile: null, pendingGravatarUrl: gravatarUrl, deleted: false });
  }

  function handleRemoveAvatar() {
    setAvatar({ previewUrl: null, pendingFile: null, pendingGravatarUrl: null, deleted: true });
  }

  async function handleSave() {
    if (!user) return;

    // 1. Update profile fields if changed
    const profileChanges: { username?: string; email?: string; password?: string } = {};
    if (username !== user.username) profileChanges.username = username;
    if (email !== user.email) profileChanges.email = email;
    if (password.trim()) profileChanges.password = password;

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

    onSaved();
  }

  const currentAvatarUrl = avatar.previewUrl;
  const displayUsername = username || (user?.username ?? "");
  const hasChanges =
    username !== (user?.username ?? "") ||
    email !== (user?.email ?? "") ||
    password.trim() !== "" ||
    avatar.pendingFile !== null ||
    avatar.pendingGravatarUrl !== null ||
    avatar.deleted;

  const canSave = hasChanges && username.trim() !== "" && email.trim() !== "" && !isPending;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl w-full max-w-lg overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ds-border-subtle)]">
          <h2 className="text-base font-semibold text-[var(--ds-text)]">Benutzer bearbeiten</h2>
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--ds-text-subtle)] hover:text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-elevated)] transition-colors"
          >
            <SFXmark className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[calc(100vh-14rem)] overflow-y-auto">
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
                  <SFCamera className="w-3.5 h-3.5 shrink-0" />
                  Bild hochladen
                </button>
                <button
                  type="button"
                  onClick={handleGravatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors"
                >
                  <SFPersonCropCircle className="w-3.5 h-3.5 shrink-0" />
                  Gravatar verwenden
                </button>
                {currentAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:text-red-500 hover:border-red-300 dark:hover:border-red-700 transition-colors"
                  >
                    <SFTrash className="w-3.5 h-3.5 shrink-0" />
                    Entfernen
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
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1">
                  <SFPencil className="w-3 h-3" />
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1">
                  <SFAt className="w-3 h-3" />
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--ds-text-muted)] mb-1">
                  <SFKey className="w-3 h-3" />
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nicht ändern"
                  className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:border-[var(--ds-border-strong)] transition-colors"
                />
              </div>
            </div>
          </div>

          {isError && (
            <p className="text-red-500 text-sm mt-4">
              {error instanceof Error ? error.message : "Fehler beim Speichern."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--ds-border-subtle)]">
          <button
            type="button"
            onClick={() => setClosing(true)}
            className="px-4 py-2 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-40"
          >
            {isPending ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
