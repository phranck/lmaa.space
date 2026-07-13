import { MagnifyingGlassIcon, TagIcon, TrashIcon, TrayArrowUpIcon } from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type RefObject,
} from "react";

import type { TemplateAssignment } from "@lmaa/contracts";
import { FocalPointOverlay, useFocalPointDrag } from "@lmaa/ui/focal-point-overlay";
import { FormLabel } from "@lmaa/ui/form-primitives";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { CancelActionButton, SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput, DashboardTextarea } from "@/components/ui/DashboardControls.tsx";
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
import { usePersistedTextareaHeight } from "@/lib/hooks/usePersistedTextareaHeight.ts";

interface CategoryEditCardProps {
  categoryId: number | "new";
  onClose: () => void;
  onSaved: () => void;
}

interface CategoryEditState {
  showUnsplash: boolean;
  form: CategoryFormData;
  image: CategoryImageState;
  templateAssignments: TemplateAssignment[];
  hasPostOverflow: boolean;
}

type CategoryEditAction =
  | Partial<CategoryEditState>
  | ((state: CategoryEditState) => CategoryEditState);

interface CategoryUnsplashPhoto {
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
}

function createInitialCategoryEditState(): CategoryEditState {
  return {
    showUnsplash: false,
    form: { name: "", slug: "", description: "" },
    image: {
      previewUrl: null,
      photographer: null,
      photographerUrl: null,
      pendingFile: null,
      pendingUnsplashUrl: null,
      pendingUnsplashData: null,
      deleted: false,
      loadError: false,
    },
    templateAssignments: [],
    hasPostOverflow: false,
  };
}

function categoryEditReducer(
  state: CategoryEditState,
  action: CategoryEditAction,
): CategoryEditState {
  return typeof action === "function" ? action(state) : { ...state, ...action };
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
  const [state, dispatchEdit] = useReducer(
    categoryEditReducer,
    undefined,
    createInitialCategoryEditState,
  );
  const { showUnsplash, form, image, templateAssignments, hasPostOverflow } = state;

  const { data: categories = [] } = useAdminCategories(!isNew);
  const category = isNew ? undefined : categories.find((c) => c.id === categoryId);

  const setFocalPoint = useSetCategoryFocalPoint();
  const handleFocalCommit = useCallback(
    (y: number) => {
      if (!isNew && category) setFocalPoint.mutate({ id: category.id, focalPointY: y });
    },
    [isNew, category, setFocalPoint],
  );
  const {
    focalY,
    containerRef: imageContainerRef,
    startDrag: startFocalDrag,
  } = useFocalPointDrag(category?.imageFocalPointY ?? 50, handleFocalCommit);

  const { data: categoryTemplates = [] } = useSocialMediaPostTemplates(
    isNew ? "category" : undefined,
  );

  // Populate form when editing existing category
  useEffect(() => {
    if (category) {
      dispatchEdit({
        form: {
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
        },
        image: {
          previewUrl: category.imageUrl ?? null,
          photographer: category.imagePhotographer ?? null,
          photographerUrl: category.imagePhotographerUrl ?? null,
          pendingFile: null,
          pendingUnsplashUrl: null,
          pendingUnsplashData: null,
          deleted: false,
          loadError: false,
        },
      });
    }
  }, [category]);

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

  function handleNameChange(name: string) {
    dispatchEdit((current) => ({
      ...current,
      form: { ...current.form, name, slug: isNew ? slugify(name) : current.form.slug },
    }));
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    dispatchEdit({
      image: {
        previewUrl: url,
        photographer: null,
        photographerUrl: null,
        pendingFile: file,
        pendingUnsplashUrl: null,
        pendingUnsplashData: null,
        deleted: false,
        loadError: false,
      },
    });
  }

  function handleUnsplashSelect(photo: CategoryUnsplashPhoto) {
    dispatchEdit({
      image: {
        previewUrl: photo.url,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        pendingFile: null,
        pendingUnsplashUrl: photo.url,
        pendingUnsplashData: photo,
        deleted: false,
        loadError: false,
      },
      showUnsplash: false,
    });
  }

  function handleDeleteImage() {
    dispatchEdit({
      image: {
        previewUrl: null,
        photographer: null,
        photographerUrl: null,
        pendingFile: null,
        pendingUnsplashUrl: null,
        pendingUnsplashData: null,
        deleted: true,
        loadError: false,
      },
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
        <CategoryImagePanel
          containerRef={imageContainerRef}
          fileInputRef={fileInputRef}
          displayImageUrl={displayImageUrl}
          imageLoadError={image.loadError}
          isNew={isNew}
          focalY={focalY}
          labels={categoriesMessages.editCard}
          onFocalMouseDown={startFocalDrag}
          onImageLoadError={() =>
            dispatchEdit((current) => ({
              ...current,
              image: { ...current.image, loadError: true },
            }))
          }
          onDeleteImage={handleDeleteImage}
          onOpenUnsplash={() => dispatchEdit({ showUnsplash: true })}
          onFileSelect={handleFileSelect}
        />

        <CategoryFormPanel
          mode={isNew ? "create" : "edit"}
          form={form}
          image={image}
          categoryTemplates={categoryTemplates}
          templateAssignments={templateAssignments}
          savedPhase={savedPhase}
          saveState={{
            hasPostOverflow,
            canSave: Boolean(canSave),
            isSaving: saveMutation.isPending,
            errorOpen: saveMutation.isError,
            errorMessage:
              saveMutation.error instanceof Error
                ? saveMutation.error.message
                : categoriesMessages.editCard.errorSaving,
          }}
          labels={categoriesMessages.editCard}
          common={common}
          savedLabel={common.saved}
          approveBlockedHint={messages.socialMedia.approve.approveBlockedHint}
          onClose={onClose}
          onSave={() => handleSave()}
          onResetSaveError={() => saveMutation.reset()}
          onNameChange={handleNameChange}
          onSlugInput={(value) =>
            dispatchEdit((current) => ({
              ...current,
              form: { ...current.form, slug: slugifyInput(value) },
            }))
          }
          onSlugBlur={(value) =>
            dispatchEdit((current) => ({
              ...current,
              form: { ...current.form, slug: slugify(value) },
            }))
          }
          onDescriptionChange={(value) =>
            dispatchEdit((current) => ({
              ...current,
              form: { ...current.form, description: value },
            }))
          }
          onTemplateAssignmentsChange={(next) => dispatchEdit({ templateAssignments: next })}
          onOverflowChange={(hasPostOverflow) => dispatchEdit({ hasPostOverflow })}
        />
      </OverlayCard>

      {showUnsplash && (
        <UnsplashBrowser
          defaultQuery={form.name}
          onSelect={handleUnsplashSelect}
          onClose={() => dispatchEdit({ showUnsplash: false })}
        />
      )}
    </>
  );
}

type CategoryEditLabels = ReturnType<typeof useI18n>["messages"]["categories"]["editCard"];
type CommonLabels = ReturnType<typeof useI18n>["messages"]["common"];

interface CategoryImagePanelProps {
  containerRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  displayImageUrl: string | null;
  imageLoadError: boolean;
  isNew: boolean;
  focalY: number;
  labels: CategoryEditLabels;
  onFocalMouseDown: ComponentProps<typeof FocalPointOverlay>["onMouseDown"];
  onImageLoadError: () => void;
  onDeleteImage: () => void;
  onOpenUnsplash: () => void;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
}

function CategoryImagePanel({
  containerRef,
  fileInputRef,
  displayImageUrl,
  imageLoadError,
  isNew,
  focalY,
  labels,
  onFocalMouseDown,
  onImageLoadError,
  onDeleteImage,
  onOpenUnsplash,
  onFileSelect,
}: CategoryImagePanelProps) {
  return (
    <div
      ref={containerRef}
      className="group relative bg-[var(--ds-bg-elevated)] flex flex-col min-h-[420px]"
    >
      {displayImageUrl && !imageLoadError ? (
        <>
          <img
            src={displayImageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            draggable={false}
            onError={onImageLoadError}
          />
          {!isNew && <FocalPointOverlay focalY={focalY} onMouseDown={onFocalMouseDown} />}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--ds-text-subtle)]">
          <MagnifyingGlassIcon weight="duotone" className="size-10" />
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1.5 bg-gradient-to-t from-black/50 to-transparent">
        {displayImageUrl && !imageLoadError && (
          <DashboardButton
            onClick={onDeleteImage}
            className="w-full"
            leadingIcon={<TrashIcon weight="duotone" className="size-3" />}
            variant="danger"
          >
            {labels.deleteImage}
          </DashboardButton>
        )}
        <DashboardButton
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          leadingIcon={<TrayArrowUpIcon weight="duotone" className="size-3" />}
          variant="neutral"
        >
          {labels.upload}
        </DashboardButton>
        <DashboardButton
          onClick={onOpenUnsplash}
          className="w-full"
          leadingIcon={<span className="text-[10px] font-semibold leading-none">U</span>}
          variant="neutral"
        >
          {labels.unsplash}
        </DashboardButton>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}

interface CategoryFormPanelProps {
  mode: "create" | "edit";
  form: CategoryFormData;
  image: CategoryImageState;
  categoryTemplates: ComponentProps<typeof TemplateAssignmentsSection>["templates"];
  templateAssignments: TemplateAssignment[];
  savedPhase: ComponentProps<typeof SaveNotification>["phase"];
  saveState: {
    hasPostOverflow: boolean;
    canSave: boolean;
    isSaving: boolean;
    errorOpen: boolean;
    errorMessage: string;
  };
  labels: CategoryEditLabels;
  common: CommonLabels;
  savedLabel: string;
  approveBlockedHint: string;
  onClose: () => void;
  onSave: () => void;
  onResetSaveError: () => void;
  onNameChange: (value: string) => void;
  onSlugInput: (value: string) => void;
  onSlugBlur: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTemplateAssignmentsChange: (next: TemplateAssignment[]) => void;
  onOverflowChange: (hasPostOverflow: boolean) => void;
}

function CategoryFormPanel({
  mode,
  form,
  image,
  categoryTemplates,
  templateAssignments,
  savedPhase,
  saveState,
  labels,
  common,
  savedLabel,
  approveBlockedHint,
  onClose,
  onSave,
  onResetSaveError,
  onNameChange,
  onSlugInput,
  onSlugBlur,
  onDescriptionChange,
  onTemplateAssignmentsChange,
  onOverflowChange,
}: CategoryFormPanelProps) {
  const isCreate = mode === "create";

  return (
    <div className="flex flex-col p-3 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TagIcon weight="duotone" className={dialogHeaderIconClass} />
          <h2 id="category-edit-title" className="text-lg font-semibold text-[var(--ds-text)]">
            {isCreate ? labels.titleNew : labels.titleEdit}
          </h2>
        </div>
        <SaveNotification phase={savedPhase} label={savedLabel} />
      </div>

      <div className="flex flex-col gap-3 flex-1">
        <div>
          <FormLabel htmlFor="cat-name">{labels.name}</FormLabel>
          <DashboardInput
            id="cat-name"
            type="text"
            value={form.name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        <div>
          <FormLabel htmlFor="cat-slug">{labels.slug}</FormLabel>
          <DashboardInput
            id="cat-slug"
            type="text"
            value={form.slug}
            onChange={(event) => onSlugInput(event.target.value)}
            onBlur={(event) => onSlugBlur(event.target.value)}
          />
        </div>

        <div>
          <FormLabel htmlFor="cat-description">{labels.description}</FormLabel>
          <DashboardTextarea
            id="cat-description"
            rows={4}
            value={form.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="resize-y"
          />
        </div>

        {isCreate && categoryTemplates.length > 0 && (
          <TemplateAssignmentsSection
            templates={categoryTemplates}
            scope="category"
            assignments={templateAssignments}
            onChange={onTemplateAssignmentsChange}
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
            onOverflowChange={onOverflowChange}
          />
        )}
      </div>

      <AlertDialog open={saveState.errorOpen} title={labels.errorSaving} onClose={onResetSaveError}>
        {saveState.errorMessage}
      </AlertDialog>

      <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-[var(--ds-border-subtle)]">
        {saveState.hasPostOverflow && (
          <span className="mr-auto text-xs text-red-500">{approveBlockedHint}</span>
        )}
        <CancelActionButton label={common.cancel} onClick={onClose} />
        <SaveActionButton
          onClick={onSave}
          disabled={!saveState.canSave}
          busy={saveState.isSaving}
          label={saveState.isSaving ? common.saving : common.save}
        />
      </div>
    </div>
  );
}
