import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CircleIcon,
  ImageIcon,
  ImagesIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { FocalPointOverlay, useFocalPointDrag } from "@lmaa/ui/focal-point-overlay";
import { ToggleSwitch } from "@lmaa/ui/toggle-switch";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  RemoveActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardNumberInput } from "@/components/ui/DashboardControls.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { UnsplashBrowser } from "@/components/ui/UnsplashBrowser.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  type HeroImage,
  useAddHeroImage,
  useDeleteHeroImage,
  useHeroImages,
  useHeroRotation,
  useHeroRotationInterval,
  useSetHeroImageFocalPoint,
  useToggleHeroImageSelected,
} from "@/features/content/hooks/useHeroImages.ts";

interface HeroImageCardProps {
  image: HeroImage;
  rotationEnabled: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  togglePending: boolean;
  deletePending: boolean;
  m: ReturnType<typeof useI18n>["messages"]["landingPage"]["heroBanner"];
}

function HeroImageCard({
  image,
  rotationEnabled,
  onToggleSelect,
  onDelete,
  togglePending,
  deletePending,
  m,
}: HeroImageCardProps) {
  const setFocalPoint = useSetHeroImageFocalPoint();
  const handleCommit = useCallback(
    (y: number) => setFocalPoint.mutate({ id: image.id, focalPointY: y }),
    [image.id, setFocalPoint],
  );
  const { focalY, containerRef, handleKeyDown, startDrag } = useFocalPointDrag(
    image.focalPointY ?? 50,
    handleCommit,
  );

  return (
    <div ref={containerRef} className="group relative rounded-control overflow-hidden">
      <img
        src={image.url}
        alt=""
        className="w-full aspect-video object-cover"
        style={{ objectPosition: `50% ${focalY}%` }}
        loading="lazy"
        draggable={false}
      />

      <FocalPointOverlay
        focalY={focalY}
        onKeyDown={handleKeyDown}
        onMouseDown={startDrag}
        title={m.focalPointDrag}
      />

      {/* Active badge */}
      {image.isSelected && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-[var(--color-primary)] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10">
          <CheckCircleIcon weight="fill" className="size-3" />
          {m.selectedBadge}
        </div>
      )}

      {/* Photographer credit */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 z-10">
        <p className="text-white text-[10px] truncate">
          {m.photographerCredit} {image.photographer}
        </p>
      </div>

      {/* Action overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex flex-wrap items-center justify-center gap-2 px-2 opacity-0 group-hover:opacity-100 z-10">
        <DashboardButton
          onClick={onToggleSelect}
          disabled={togglePending}
          className="bg-white text-stone-900 hover:bg-stone-100"
          size="control"
          title={
            image.isSelected ? m.markDeselected : rotationEnabled ? m.markSelected : m.markActive
          }
          variant="neutral"
          leadingIcon={
            image.isSelected ? (
              <CircleIcon weight="regular" className="size-3.5" />
            ) : (
              <CheckCircleIcon weight="duotone" className="size-3.5" />
            )
          }
        >
          {image.isSelected ? m.markDeselected : rotationEnabled ? m.markSelected : m.markActive}
        </DashboardButton>
        <DashboardButton
          onClick={onDelete}
          disabled={deletePending}
          className="bg-white hover:bg-red-50"
          title={m.removeImage}
          size="control"
          variant="danger"
          leadingIcon={<TrashIcon weight="duotone" className="size-3.5" />}
        >
          {m.removeImage}
        </DashboardButton>
      </div>
    </div>
  );
}

/**
 * Hero Banner tab inside the Landing Page editor.
 *
 * Lets admins collect Unsplash images into a pool and mark individual images
 * as active for the daily hero rotation on the public homepage.
 */
export function HeroBannerTab() {
  const { messages } = useI18n();
  const m = messages.landingPage.heroBanner;

  const { data: images = [], isLoading } = useHeroImages();
  const addMutation = useAddHeroImage();
  const deleteMutation = useDeleteHeroImage();
  const toggleMutation = useToggleHeroImageSelected();
  const rotation = useHeroRotation();
  const intervalConfig = useHeroRotationInterval();

  const [showBrowser, setShowBrowser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // Local state for interval input
  const [localInterval, setLocalInterval] = useState(intervalConfig.interval);

  // Sync local state when server data loads
  useEffect(() => {
    setLocalInterval(intervalConfig.interval);
  }, [intervalConfig.interval]);

  const intervalDirty = localInterval !== intervalConfig.interval;

  const hasSelected = images.some((img) => img.isSelected);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Rotation Section */}
          <DashboardSection expanded={rotation.enabled}>
            <DashboardSection.Header
              icon={<ArrowsClockwiseIcon weight="duotone" className="size-4" />}
              title={m.rotationLabel}
              addOn={
                <ToggleSwitch
                  checked={rotation.enabled}
                  onChange={rotation.setEnabled}
                  disabled={rotation.isPending}
                />
              }
            />
            <DashboardSection.Body>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="rotation-interval"
                  className="text-sm text-[var(--ds-text)] shrink-0"
                >
                  {m.rotationInterval}
                </label>
                <DashboardNumberInput
                  id="rotation-interval"
                  min={1}
                  max={99}
                  value={localInterval}
                  onChange={(e) =>
                    setLocalInterval(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                  }
                  className="w-14 text-center"
                />
                <span className="text-sm text-[var(--ds-text-muted)]">
                  {m.rotationIntervalSuffix}
                </span>
                {intervalDirty && (
                  <SaveActionButton
                    disabled={intervalConfig.isSaving}
                    onClick={() => intervalConfig.save(localInterval)}
                    className="ml-auto"
                    busy={intervalConfig.isSaving}
                    label={m.rotationIntervalSave}
                  />
                )}
              </div>
            </DashboardSection.Body>
          </DashboardSection>

          {/* Image Pool Section */}
          <DashboardSection>
            <DashboardSection.Header
              icon={<ImagesIcon weight="duotone" className="size-4" />}
              title={m.imagePool}
            />
            <DashboardSection.Body>
              {/* Hint when nothing is selected */}
              {!isLoading && images.length > 0 && !hasSelected && (
                <p className="text-sm text-[var(--ds-text-subtle)] bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-subtle)] rounded-control px-4 py-3">
                  {m.noImagesSelected}
                </p>
              )}

              {/* Empty state */}
              {!isLoading && images.length === 0 && (
                <ContentUnavailableView
                  icon={<ImageIcon weight="duotone" aria-hidden />}
                  title={m.imagePoolEmpty}
                  subtitle={m.imagePoolHint}
                />
              )}

              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image) => (
                    <HeroImageCard
                      key={image.id}
                      image={image}
                      rotationEnabled={rotation.enabled}
                      onToggleSelect={() =>
                        toggleMutation.mutate({ id: image.id, selected: !image.isSelected })
                      }
                      onDelete={() => setDeleteTarget(image.id)}
                      togglePending={toggleMutation.isPending}
                      deletePending={deleteMutation.isPending}
                      m={m}
                    />
                  ))}
                </div>
              )}
            </DashboardSection.Body>
          </DashboardSection>
        </div>
      </div>

      {/* Footer: "Bilder hinzufügen" button */}
      <PageFooter>
        <DashboardButton
          onClick={() => setShowBrowser(true)}
          leadingIcon={<PlusIcon weight="bold" className="size-3.5" />}
          size="control"
          variant="primary"
        >
          {m.addImages}
        </DashboardButton>
      </PageFooter>

      {/* Unsplash Browser */}
      {showBrowser && (
        <UnsplashBrowser
          onSelect={(photo) => {
            addMutation.mutate(photo);
            setShowBrowser(false);
          }}
          onSelectMultiple={(photos) => {
            for (const photo of photos) {
              addMutation.mutate(photo);
            }
            setShowBrowser(false);
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        title={m.removeConfirmTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setDeleteTarget(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">{m.removeConfirmDescription}</p>
        </div>
        <Dialog.Footer>
          <CancelActionButton
            label={messages.common.cancel}
            onClick={() => setDeleteTarget(null)}
          />
          <RemoveActionButton
            disabled={deleteMutation.isPending}
            label={m.removeImage}
            onClick={() => {
              if (deleteTarget === null) return;
              deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
            }}
          />
        </Dialog.Footer>
      </Dialog>
    </>
  );
}
