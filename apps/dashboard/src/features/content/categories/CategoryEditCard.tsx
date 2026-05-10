import {
  MagnifyingGlassIcon,
  TagIcon,
  TrashIcon,
  TrayArrowUpIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TemplateAssignment } from "@lmaa/contracts";
import { FocalPointOverlay, FormLabel, useFocalPointDrag } from "@lmaa/ui";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import {
  CancelActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import {
  DashboardInput,
  DashboardTextarea,
} from "@/components/ui/DashboardControls.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { SaveNotification, useSaveNotification } from "@/components/ui/SaveNotification.tsx";
import { UnsplashBrowser } from "@/components/ui/UnsplashBrowser.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { renderCategoryPostPreview } from "@/features/content/categories/category-post-preview.ts";
import {
  useAdminCategories,
  useSaveCategory,
  useSetCategoryFocalPoint,
} from "@/features/content/hooks/useAdminCategories.ts";
import type {
  CategoryFormData,
  CategoryImageState,
} from "@/features/content/hooks/useAdminCategories.ts";
import { TemplateAssignmentsSection } from "@/features/social/components/TemplateAssignmentsSection.tsx";
import { useSocialMediaPostTemplates } from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

interface CategoryEditCardProps {
  categoryId: number | "new";
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Converts category names into slug-safe strings.
 *
 * @param s - Free-text category name.
 * @returns Lowercase URL slug.
 */
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugifyInput(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9-]+/g, "-");
}

/**
 * Overlay card for creating/updating categories and category images.
 *
 * Hidden behavior: supports three image input paths (upload, Unsplash, delete)
 * and syncs all changes in the save mutation.
 *
 * @param props - Edit target id and close/save callbacks.
 * @returns Modal-like category editor.
 */
export function CategoryEditCard({ categoryId, onClose, onSaved }: CategoryEditCardProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const categoriesMessages = messages.categories;
  const isNew = categoryId === "new";
  const { phase: savedPhase, show: showSaved } = useSaveNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUnsplash, setShowUnsplash] = useState(false);

  const { data: categories = [] } = useAdminCategories(!isNew);
  const category = isNew ? undefined : categories.find((c) => c.id === categoryId);

  const setFocalPoint = useSetCategoryFocalPoint();
  const handleFocalCommit = useCallback(
    (y: number) => { if (!isNew && category) setFocalPoint.mutate({ id: category.id, focalPointY: y }); },
    [isNew, category?.id, setFocalPoint],
  );
  const { focalY, containerRef: imageContainerRef, startDrag: startFocalDrag } = useFocalPointDrag(
    category?.imageFocalPointY ?? 50,
    handleFocalCommit,
  );

  const [form, setForm] = useState<CategoryFormData>({ name: "", slug: "", description: "" });
  const [image, setImage] = useState<CategoryImageState>({
    previewUrl: null,
    photographer: null,
    photographerUrl: null,
    pendingFile: null,
    pendingUnsplashUrl: null,
    pendingUnsplashData: null,
    deleted: false,
    loadError: false,
  });
  const [templateAssignments, setTemplateAssignments] = useState<TemplateAssignment[]>([]);
  const [hasPostOverflow, setHasPostOverflow] = useState(false);
  const { data: categoryTemplates = [] } = useSocialMediaPostTemplates(
    isNew ? "category" : undefined,
  );

  // Populate form when editing existing category
  // biome-ignore lint/correctness/useExhaustiveDependencies: category?.id intentionally used -- sync only when category changes, not on every property update
  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
      });
      setImage({
        previewUrl: category.imageUrl ?? null,
        photographer: category.imagePhotographer ?? null,
        photographerUrl: category.imagePhotographerUrl ?? null,
        pendingFile: null,
        pendingUnsplashUrl: null,
        pendingUnsplashData: null,
        deleted: false,
        loadError: false,
      });
    }
  }, [category?.id]);

  const handleEscape = useCallback(() => {
    if (showUnsplash) return false;
    return true;
  }, [showUnsplash]);

  const saveMutation = useSaveCategory(categoryId);

  usePersistedTextareaHeight("cat-description", "categories:textarea:description");

  function handleSave(close = true) {
    saveMutation.mutate(
      { form, image, templateAssignments: isNew ? templateAssignments : undefined },
      { onSuccess: close ? onSaved : showSaved },
    );
  }

  useKeyboardSave(() => {
    if (canSave) handleSave(false);
  });

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: isNew ? slugify(name) : f.slug }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage({
      previewUrl: url,
      photographer: null,
      photographerUrl: null,
      pendingFile: file,
      pendingUnsplashUrl: null,
      pendingUnsplashData: null,
      deleted: false,
      loadError: false,
    });
  }

  function handleUnsplashSelect(photo: {
    unsplashId: string;
    url: string;
    urlSmall: string;
    photographer: string;
    photographerUrl: string;
    downloadLocation: string;
    width: number;
    height: number;
    color: string | null;
    blurHash: string | null;
    description: string | null;
    altDescription: string | null;
    likes: number;
    createdAt: string;
  }) {
    setImage({
      previewUrl: photo.url,
      photographer: photo.photographer,
      photographerUrl: photo.photographerUrl,
      pendingFile: null,
      pendingUnsplashUrl: photo.url,
      pendingUnsplashData: photo,
      deleted: false,
      loadError: false,
    });
    setShowUnsplash(false);
  }

  function handleDeleteImage() {
    setImage({
      previewUrl: null,
      photographer: null,
      photographerUrl: null,
      pendingFile: null,
      pendingUnsplashUrl: null,
      pendingUnsplashData: null,
      deleted: true,
      loadError: false,
    });
  }

  const displayImageUrl = image.loadError
    ? null
    : (image.previewUrl ??
      (image.deleted
        ? null
        : (category?.imageUrl ?? (category ? `/images/${category.slug}.jpg` : null))));

  const canSave =
    form.name.trim() && form.slug.trim() && !saveMutation.isPending && !hasPostOverflow;

  return (
    <>
      <OverlayCard
        open
        onClose={onClose}
        size={{ storageKey: "categories:edit-card-size", defaultWidth: 768 }}
        aria-label={
          isNew ? categoriesMessages.editCard.titleNew : categoriesMessages.editCard.titleEdit
        }
        className="grid grid-cols-2"
        onEscape={handleEscape}
      >
        {/* Image Panel -- 50 % */}
        <div ref={imageContainerRef} className="group relative bg-[var(--ds-bg-elevated)] flex flex-col min-h-[420px]">
          {displayImageUrl && !image.loadError ? (
            <>
              <img
                src={displayImageUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
                draggable={false}
                onError={() => setImage((prev) => ({ ...prev, loadError: true }))}
              />
              {!isNew && (
                <FocalPointOverlay focalY={focalY} onMouseDown={startFocalDrag} />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--ds-text-subtle)]">
              <MagnifyingGlassIcon weight="duotone" className="size-10" />
            </div>
          )}

          {/* Image action buttons */}
          <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1.5 bg-gradient-to-t from-black/50 to-transparent">
            {displayImageUrl && !image.loadError && (
              <DashboardButton
                onClick={handleDeleteImage}
                className="w-full"
                leadingIcon={<TrashIcon weight="duotone" className="size-3" />}
                variant="danger"
              >
                {categoriesMessages.editCard.deleteImage}
              </DashboardButton>
            )}
            <DashboardButton
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              leadingIcon={<TrayArrowUpIcon weight="duotone" className="size-3" />}
              variant="neutral"
            >
              {categoriesMessages.editCard.upload}
            </DashboardButton>
            <DashboardButton
              onClick={() => setShowUnsplash(true)}
              className="w-full"
              leadingIcon={<span className="text-[10px] font-semibold leading-none">U</span>}
              variant="neutral"
            >
              {categoriesMessages.editCard.unsplash}
            </DashboardButton>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Form Panel -- 50 % */}
        <div className="flex flex-col p-3 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TagIcon weight="duotone" className={dialogHeaderIconClass} />
              <h2 id="category-edit-title" className="text-lg font-semibold text-[var(--ds-text)]">
                {isNew
                  ? categoriesMessages.editCard.titleNew
                  : categoriesMessages.editCard.titleEdit}
              </h2>
            </div>
            <SaveNotification phase={savedPhase} label={common.saved} />
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <div>
              <FormLabel htmlFor="cat-name">{categoriesMessages.editCard.name}</FormLabel>
              <DashboardInput
                id="cat-name"
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>

            <div>
              <FormLabel htmlFor="cat-slug">{categoriesMessages.editCard.slug}</FormLabel>
              <DashboardInput
                id="cat-slug"
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugifyInput(e.target.value) }))}
                onBlur={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              />
            </div>

            <div>
              <FormLabel htmlFor="cat-description">
                {categoriesMessages.editCard.description}
              </FormLabel>
              <DashboardTextarea
                id="cat-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="resize-y"
              />
            </div>

            {isNew && categoryTemplates.length > 0 && (
              <TemplateAssignmentsSection
                templates={categoryTemplates}
                scope="category"
                assignments={templateAssignments}
                onChange={setTemplateAssignments}
                open
                previewBody={(template, platform) =>
                  renderCategoryPostPreview(
                    platform === "mastodon" ? template.bodyMastodon : template.bodyBluesky,
                    {
                      category: {
                        name: form.name,
                        slug: form.slug,
                        description: form.description,
                        imageUrl: image.previewUrl,
                      },
                    },
                  )
                }
                onOverflowChange={setHasPostOverflow}
              />
            )}
          </div>

          <AlertDialog
            open={saveMutation.isError}
            title={categoriesMessages.editCard.errorSaving}
            onClose={() => saveMutation.reset()}
          >
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : categoriesMessages.editCard.errorSaving}
          </AlertDialog>

          {/* Footer buttons */}
          <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-[var(--ds-border-subtle)]">
            {hasPostOverflow && (
              <span className="mr-auto text-xs text-red-500">
                {messages.socialMedia.approve.approveBlockedHint}
              </span>
            )}
            <CancelActionButton
              label={common.cancel}
              onClick={onClose}
            />
            <SaveActionButton
              onClick={() => handleSave()}
              disabled={!canSave}
              busy={saveMutation.isPending}
              label={saveMutation.isPending ? common.saving : common.save}
            />
          </div>
        </div>
      </OverlayCard>

      {showUnsplash && (
        <UnsplashBrowser
          defaultQuery={form.name}
          onSelect={handleUnsplashSelect}
          onClose={() => setShowUnsplash(false)}
        />
      )}
    </>
  );
}
