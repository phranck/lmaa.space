import { ImageIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { fieldLabelClass, fieldShellClass } from "@lmaa/ui/field-primitives";

import {
  DashboardActionButton,
  RemoveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { MediaImagePickerDialog } from "@/features/system/media/MediaImagePickerDialog.tsx";
import { isEmailBannerImage } from "@/features/templates/email-templates/email-banner-images.ts";

/**
 * Props for {@link EmailBannerField}.
 *
 * @property label - Names the banner, such as the header image or the footer
 *   image.
 * @property value - Public URL of the current banner, or an empty string when
 *   the template has none. A URL that did not come from the media library,
 *   such as the masthead on the website, shows the same way.
 * @property onChange - Receives the URL of the chosen image, or an empty string
 *   when the banner is removed.
 */
export interface EmailBannerFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

/**
 * Header or footer image of an email template, chosen from the media library.
 *
 * Shows the current banner as a thumbnail with a button that opens the media
 * picker and, while a banner is set, a button that removes it. The picker
 * offers only the image types an email client can display, and says so in its
 * footer. The stored value is the asset's public URL, because that is what the
 * backend writes into the email.
 */
export function EmailBannerField({ label, value, onChange }: EmailBannerFieldProps) {
  const { messages } = useI18n();
  const [pickerOpen, setPickerOpen] = useState(false);
  const chooseButtonRef = useRef<HTMLButtonElement>(null);

  // The remove button disappears with the banner, so focus moves to the one
  // button that stays rather than falling back to the page.
  function removeBanner() {
    onChange("");
    chooseButtonRef.current?.focus();
  }

  return (
    <fieldset className={`m-0 min-w-0 border-0 p-0 ${fieldShellClass}`}>
      <legend className={`p-0 ${fieldLabelClass}`}>{label}</legend>
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex h-16 w-48 shrink-0 items-center justify-center overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]"
          title={value || undefined}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-[var(--ds-text-muted)]">
              <ImageIcon weight="duotone" className="size-4" aria-hidden />
              {messages.emailTemplates.bannerEmpty}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {value && <RemoveActionButton type="button" onClick={removeBanner} />}
          <DashboardActionButton
            ref={chooseButtonRef}
            action="chooseImage"
            type="button"
            onClick={() => setPickerOpen(true)}
          />
        </div>
      </div>
      <MediaImagePickerDialog
        open={pickerOpen}
        accept={isEmailBannerImage}
        hint={messages.emailTemplates.bannerFormatsHint}
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          onChange(asset.url);
          setPickerOpen(false);
        }}
      />
    </fieldset>
  );
}
