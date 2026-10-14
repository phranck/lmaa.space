import { ImageIcon } from "@phosphor-icons/react";
import { useMemo } from "react";

import type { MediaAsset } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CancelActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAdminMedia } from "@/features/system/hooks/useAdminMedia.ts";
import { isImageAsset } from "@/features/system/media/media-utils.ts";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";

/**
 * Props for {@link MediaImagePickerDialog}.
 *
 * @property open - Whether the dialog is shown. The media library is only
 *   requested while it is.
 * @property onClose - Called when the dialog is dismissed without a choice.
 * @property onSelect - Called with the image that was clicked. The dialog does
 *   not close itself, so the caller decides whether a choice ends it.
 * @property accept - Narrows the offered images further, such as to the types
 *   an email client can display. Every image is offered when it is omitted.
 * @property hint - One line in the footer that says why some uploaded images
 *   are not offered. Belongs with `accept`.
 */
interface MediaImagePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  accept?: (asset: MediaAsset) => boolean;
  hint?: string;
}

/**
 * Dialog that lets an editor pick one image from the media library.
 *
 * It shows every image asset as a tile and reports the clicked one. The
 * social preview editor uses it to add an image layer and the email template
 * editor to set a banner. The content mounts only while the dialog is open,
 * so a page that never opens it never requests the library.
 */
export function MediaImagePickerDialog({ open, ...contentProps }: MediaImagePickerDialogProps) {
  if (!open) return null;
  return <MediaImagePickerDialogContent {...contentProps} />;
}

function MediaImagePickerDialogContent({
  onClose,
  onSelect,
  accept,
  hint,
}: Omit<MediaImagePickerDialogProps, "open">) {
  const { messages } = useI18n();
  const pickerMessages = messages.media.imagePicker;
  const { data: mediaAssets = [], isLoading } = useAdminMedia();
  const images = useMemo(
    () => mediaAssets.filter((asset) => isImageAsset(asset) && (accept?.(asset) ?? true)),
    [mediaAssets, accept],
  );

  return (
    <OverlayCard
      open
      onClose={onClose}
      size={{
        storageKey: "media:image-picker-size",
        defaultWidth: 860,
        defaultHeight: 640,
        minWidth: 520,
        minHeight: 420,
      }}
      aria-label={pickerMessages.title}
      style={{ maxHeight: "calc(100vh - 2rem)" }}
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <ImageIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 className="text-base font-semibold text-[var(--ds-text)]">{pickerMessages.title}</h2>
        </div>
      </OverlayCard.Header>
      <OverlayCard.Body className="min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {Array.from({ length: 8 }, (_, index) => `image-picker-skeleton-${index}`).map(
              (key) => (
                <div key={key} className="space-y-2">
                  <div className="aspect-square animate-pulse rounded-[var(--radius-card)] bg-[var(--ds-bg-elevated)]" />
                  <div className="mx-2 h-3 animate-pulse rounded bg-[var(--ds-bg-elevated)]" />
                </div>
              ),
            )}
          </div>
        ) : images.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center">
            <ContentUnavailableView
              chromeless
              icon={<ImageIcon weight="duotone" aria-hidden />}
              title={pickerMessages.empty}
              subtitle={pickerMessages.emptyHint}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
            {images.map((asset) => (
              <MediaGridItem
                key={asset.id}
                asset={asset}
                selected={false}
                showText
                title={asset.displayName}
                onSelect={() => onSelect(asset)}
              />
            ))}
          </div>
        )}
      </OverlayCard.Body>
      <OverlayCard.Footer className="flex items-center justify-end gap-3">
        {hint && <p className="mr-auto text-xs text-[var(--ds-text-muted)]">{hint}</p>}
        <CancelActionButton label={messages.common.cancel} onClick={onClose} />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
