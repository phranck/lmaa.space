import type { MediaAsset } from "@lmaa/shared";

import { DeleteActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import type { useI18n } from "@/context/I18nContext.tsx";
import { isHlsBundleAsset } from "@/features/system/media/media-utils.ts";
import {
  MediaLinkedContentSection,
  type MediaLinkedContentUsage,
} from "@/features/system/media/MediaLinkedContentSection.tsx";

interface MediaMetaFormSectionProps {
  asset: MediaAsset;
  common: ReturnType<typeof useI18n>["messages"]["common"];
  draft: { name: string; alias: string };
  isRenaming: boolean;
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  onDelete: () => void;
  onDraftChange: (draft: { name: string; alias: string }) => void;
  onSaveMeta: () => void;
  usages: MediaLinkedContentUsage[];
}

export function MediaMetaFormSection({
  asset,
  common,
  draft,
  isRenaming,
  mediaMessages,
  onDelete,
  onDraftChange,
  onSaveMeta,
  usages,
}: MediaMetaFormSectionProps) {
  const aliasHint = draft.alias
    ? isHlsBundleAsset(asset)
      ? mediaMessages.aliasHintHls(draft.alias)
      : mediaMessages.aliasHintImage(draft.alias)
    : mediaMessages.aliasHintEmpty;
  const nameInputId = `media-asset-display-name-${asset.id}`;
  const aliasInputId = `media-asset-alias-${asset.id}`;

  return (
    <>
      <DashboardInput
        id={nameInputId}
        type="text"
        label={mediaMessages.displayName}
        value={draft.name}
        onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
      />

      <DashboardInput
        id={aliasInputId}
        type="text"
        label={mediaMessages.alias}
        hint={aliasHint}
        value={draft.alias}
        onChange={(event) =>
          onDraftChange({
            ...draft,
            alias: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          })
        }
        placeholder={mediaMessages.aliasPlaceholder}
        className="font-mono"
      />

      <MediaLinkedContentSection mediaMessages={mediaMessages} usages={usages} />

      <div className="flex gap-2">
        <SaveActionButton
          onClick={onSaveMeta}
          disabled={
            isRenaming ||
            draft.name.trim().length === 0 ||
            ((draft.alias.trim() || null) === (asset.alias ?? null) &&
              draft.name.trim() === asset.displayName)
          }
          className="flex-1"
          busy={isRenaming}
          label={isRenaming ? common.saving : common.save}
        />
        <DeleteActionButton onClick={onDelete} iconOnly label={common.delete} />
      </div>
    </>
  );
}
