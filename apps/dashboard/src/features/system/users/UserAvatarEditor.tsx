import { TrashIcon, TrayArrowUpIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { ChangeEvent, RefObject } from "react";

import type { DashboardMessages } from "@/i18n/messages.ts";

interface UserAvatarEditorProps {
  currentAvatarUrl: string | null;
  displayUsername: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onUseGravatar: () => void;
  usersMessages: DashboardMessages["users"];
}

export function UserAvatarEditor({
  currentAvatarUrl,
  displayUsername,
  fileInputRef,
  onFileChange,
  onRemoveAvatar,
  onUseGravatar,
  usersMessages,
}: UserAvatarEditorProps) {
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)]"
        >
          <TrayArrowUpIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
          {usersMessages.editCard.uploadImage}
        </button>
        <button
          type="button"
          onClick={onUseGravatar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)]"
        >
          <UserCircleIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
          {usersMessages.editCard.useGravatar}
        </button>
        {currentAvatarUrl && (
          <button
            type="button"
            onClick={onRemoveAvatar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control border border-[var(--ds-border)] text-xs text-[var(--ds-text-muted)] hover:text-red-500 hover:border-red-300 dark:hover:border-red-700"
          >
            <TrashIcon weight="duotone" className="w-3.5 h-3.5 shrink-0" />
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
