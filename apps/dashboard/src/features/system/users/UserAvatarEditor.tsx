import { TrashIcon, TrayArrowUpIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { ChangeEvent, RefObject } from "react";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
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
      <div className="size-24 rounded-full overflow-hidden ring-2 ring-[var(--ds-border)] bg-[var(--ds-bg-elevated)] flex items-center justify-center">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt={displayUsername}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-3xl font-semibold text-[var(--ds-text-subtle)] select-none">
            {displayUsername[0]?.toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <DashboardButton
          onClick={() => fileInputRef.current?.click()}
          leadingIcon={<TrayArrowUpIcon weight="duotone" className="size-3.5 shrink-0" />}
          variant="neutral"
        >
          {usersMessages.editCard.uploadImage}
        </DashboardButton>
        <DashboardButton
          onClick={onUseGravatar}
          leadingIcon={<UserCircleIcon weight="duotone" className="size-3.5 shrink-0" />}
          variant="neutral"
        >
          {usersMessages.editCard.useGravatar}
        </DashboardButton>
        {currentAvatarUrl && (
          <DashboardButton
            onClick={onRemoveAvatar}
            leadingIcon={<TrashIcon weight="duotone" className="size-3.5 shrink-0" />}
            variant="danger"
          >
            {usersMessages.editCard.removeAvatar}
          </DashboardButton>
        )}
      </div>

      <input
        aria-label={usersMessages.editCard.uploadImage}
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}
