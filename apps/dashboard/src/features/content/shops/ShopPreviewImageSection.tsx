import { ArrowClockwiseIcon, CopyIcon, ImageIcon, StorefrontIcon } from "@phosphor-icons/react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";

import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";

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
        icon={<ImageIcon weight="duotone" className="size-4" />}
        title={previewImageLabel}
      />
      <DashboardSection.Body>
        <div className="flex items-stretch gap-3">
          <div className="shrink-0 w-18 aspect-square rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-alt)] overflow-hidden flex items-center justify-center">
            {displayImage ? (
              <img src={displayImage} alt="" className="size-full object-contain" />
            ) : name ? (
              <span className="text-xl font-semibold text-[var(--ds-text-subtle)] select-none">
                {name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <StorefrontIcon weight="duotone" className="size-5 text-[var(--ds-text-subtle)]" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <DashboardInput
              type="text"
              value={ogImageInput}
              onChange={(e) => onChangeOgImageInput(e.target.value)}
              placeholder={placeholder}
              className="min-w-0"
            />
            <div className="flex gap-1.5 justify-end">
              <DashboardButton
                onClick={onRefreshImage}
                disabled={isRefetchPending || isLoading}
                className="shrink-0"
                leadingIcon={
                  <ArrowClockwiseIcon
                    weight="duotone"
                    className={`size-3 ${isRefetchPending ? "animate-spin" : ""}`}
                  />
                }
                variant="neutral"
              >
                {reloadImageLabel}
              </DashboardButton>
              <DashboardButton
                onClick={onApplyImage}
                disabled={isSavingImage || isLoading}
                className="shrink-0"
                leadingIcon={<CopyIcon weight="duotone" className="size-3" />}
                variant="neutral"
              >
                {setImageLabel}
              </DashboardButton>
            </div>
          </div>
        </div>
      </DashboardSection.Body>
    </DashboardSection>
  );
}
