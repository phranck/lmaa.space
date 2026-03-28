import {
  ArrowClockwiseIcon,
  CopyIcon,
  ImageIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";

import { DashboardSection } from "@lmaa/ui";

interface ShopPreviewImageSectionProps {
  displayImage: string | null;
  isLoading: boolean;
  isRefetchPending: boolean;
  isSavingImage: boolean;
  name: string;
  ogImageInput: string;
  onApplyImage: () => void;
  onChangeOgImageInput: (value: string) => void;
  onRefreshImage: () => void;
  placeholder: string;
  previewImageLabel: string;
  reloadImageLabel: string;
  setImageLabel: string;
}

const buttonClass =
  "flex items-center gap-1.5 px-3 py-1.5 border border-[var(--ds-btn-neutral-border)] rounded-control text-xs text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] hover:bg-[var(--ds-btn-neutral-hover-bg)] transition-colors disabled:opacity-40";

export function ShopPreviewImageSection({
  displayImage,
  isLoading,
  isRefetchPending,
  isSavingImage,
  name,
  ogImageInput,
  onApplyImage,
  onChangeOgImageInput,
  onRefreshImage,
  placeholder,
  previewImageLabel,
  reloadImageLabel,
  setImageLabel,
}: ShopPreviewImageSectionProps) {
  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
        title={previewImageLabel}
      />
      <DashboardSection.Body>
      <div className="flex items-stretch gap-3">
        <div className="shrink-0 w-18 aspect-square rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-alt)] overflow-hidden flex items-center justify-center">
          {displayImage ? (
            <img src={displayImage} alt="" className="w-full h-full object-contain" />
          ) : name ? (
            <span className="text-xl font-bold text-[var(--ds-text-subtle)] select-none">
              {name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <StorefrontIcon weight="duotone" className="w-5 h-5 text-[var(--ds-text-subtle)]" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <input
            type="text"
            value={ogImageInput}
            onChange={(e) => onChangeOgImageInput(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 w-full px-3 py-1.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <div className="flex gap-1.5 justify-end">
            <button
              type="button"
              onClick={onRefreshImage}
              disabled={isRefetchPending || isLoading}
              className={`${buttonClass} shrink-0`}
            >
              <ArrowClockwiseIcon
                weight="duotone"
                className={`w-3 h-3 ${isRefetchPending ? "animate-spin" : ""}`}
              />
              {reloadImageLabel}
            </button>
            <button
              type="button"
              onClick={onApplyImage}
              disabled={isSavingImage || isLoading}
              className={`${buttonClass} shrink-0`}
            >
              <CopyIcon weight="duotone" className="w-3 h-3" />
              {setImageLabel}
            </button>
          </div>
        </div>
      </div>
      </DashboardSection.Body>
    </DashboardSection>
  );
}
