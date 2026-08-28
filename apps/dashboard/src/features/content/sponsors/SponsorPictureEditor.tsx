import { ArrowClockwiseIcon, TrashIcon } from "@phosphor-icons/react";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import type { DashboardMessages } from "@/i18n/messages.ts";

interface SponsorPictureEditorProps {
  /** The picture as it stands, or an empty string when there is none. */
  imageUrl: string;
  /** The name the initial is taken from while no picture is set. */
  displayName: string;
  /** Whether an address is present that a picture could be fetched from. */
  canFetch: boolean;
  /** Whether a fetch is running right now. */
  isFetching: boolean;
  onFetch: () => void;
  onRemove: () => void;
  sponsorMessages: DashboardMessages["system"]["sponsors"];
}

/**
 * The sponsor's picture with the two things one can do to it.
 *
 * The picture normally arrives on its own, resolved from the social media
 * address as it is entered. The button is for the case where it did not, or
 * where the person has changed their picture since.
 */
export function SponsorPictureEditor({
  imageUrl,
  displayName,
  canFetch,
  isFetching,
  onFetch,
  onRemove,
  sponsorMessages,
}: SponsorPictureEditorProps) {
  return (
    <div className="flex w-40 shrink-0 flex-col items-center gap-3">
      <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-[var(--ds-bg-elevated)] ring-2 ring-[var(--ds-border)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="select-none text-3xl font-semibold text-[var(--ds-text-subtle)]">
            {displayName.trim()[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <DashboardButton
          onClick={onFetch}
          disabled={!canFetch || isFetching}
          leadingIcon={<ArrowClockwiseIcon weight="duotone" className="size-3.5 shrink-0" />}
          variant="neutral"
        >
          {sponsorMessages.refreshPicture}
        </DashboardButton>
        {imageUrl && (
          <DashboardButton
            onClick={onRemove}
            leadingIcon={<TrashIcon weight="duotone" className="size-3.5 shrink-0" />}
            variant="danger"
          >
            {sponsorMessages.removePicture}
          </DashboardButton>
        )}
      </div>
    </div>
  );
}
