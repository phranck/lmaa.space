import { useI18n } from "@/context/I18nContext.tsx";
import { UnsplashBrowser } from "@/features/content/categories/UnsplashBrowser.tsx";
import {
  useAdminCategories,
  useSaveCategory,
} from "@/features/content/hooks/useAdminCategories.ts";
import type {
  CategoryFormData,
  CategoryImageState,
} from "@/features/content/hooks/useAdminCategories.ts";
import { useEffect, useRef, useState } from "react";
import { SFMagnifyingglass, SFSquareAndArrowUpFill, SFTrashFill } from "sf-symbols-lib/monochrome";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data: categories = [] } = useAdminCategories(!isNew);
  const category = isNew ? undefined : categories.find((c) => c.id === categoryId);

  const [form, setForm] = useState<CategoryFormData>({ name: "", slug: "", description: "" });
  const [image, setImage] = useState<CategoryImageState>({
    previewUrl: null,
    photographer: null,
    photographerUrl: null,
    pendingFile: null,
    pendingUnsplashUrl: null,
    deleted: false,
    loadError: false,
  });

  // Populate form when editing existing category
  // biome-ignore lint/correctness/useExhaustiveDependencies: category?.id intentionally used – sync only when category changes, not on every property update
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
        deleted: false,
        loadError: false,
      });
    }
  }, [category?.id]);

  // ESC key starts the close animation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !showUnsplash) setClosing(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showUnsplash]);

  const saveMutation = useSaveCategory(categoryId);

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
      deleted: false,
      loadError: false,
    });
  }

  function handleUnsplashSelect(imageUrl: string, photographer: string, photographerUrl: string) {
    setImage({
      previewUrl: imageUrl,
      photographer,
      photographerUrl,
      pendingFile: null,
      pendingUnsplashUrl: imageUrl,
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

  const canSave = form.name.trim() && form.slug.trim() && !saveMutation.isPending;

  return (
    <>
      {/* Backdrop – fade in on mount, fade out on close */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`relative bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl w-full max-w-3xl grid grid-cols-2 overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}
        >
          {/* Image Panel – 50 % */}
          <div className="relative bg-[var(--ds-bg-elevated)] flex flex-col min-h-[420px]">
            {displayImageUrl && !image.loadError ? (
              <img
                src={displayImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImage((prev) => ({ ...prev, loadError: true }))}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--ds-text-subtle)]">
                <SFMagnifyingglass className="w-10 h-10" />
              </div>
            )}

            {/* Image action buttons */}
            <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1.5 bg-gradient-to-t from-black/50 to-transparent">
              {displayImageUrl && !image.loadError && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-[var(--ds-input-bg)]/90 hover:bg-[var(--ds-input-bg)] text-[var(--ds-btn-danger-text)] text-xs font-medium transition-colors w-full"
                >
                  <SFTrashFill className="w-3 h-3" />
                  {categoriesMessages.editCard.deleteImage}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-[var(--ds-input-bg)]/90 hover:bg-[var(--ds-input-bg)] text-[var(--ds-text)] text-xs font-medium transition-colors w-full"
              >
                <SFSquareAndArrowUpFill className="w-3 h-3" />
                {categoriesMessages.editCard.upload}
              </button>
              <button
                type="button"
                onClick={() => setShowUnsplash(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-[var(--ds-input-bg)]/90 hover:bg-[var(--ds-input-bg)] text-[var(--ds-text)] text-xs font-medium transition-colors w-full"
              >
                <span className="text-[10px] font-bold leading-none">U</span>
                {categoriesMessages.editCard.unsplash}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Form Panel – 50 % */}
          <div className="flex flex-col p-3 min-w-0">
            <h2 className="text-lg font-semibold text-[var(--ds-text)] mb-4">
              {isNew ? categoriesMessages.editCard.titleNew : categoriesMessages.editCard.titleEdit}
            </h2>

            <div className="flex flex-col gap-3 flex-1">
              <div>
                <label
                  htmlFor="cat-name"
                  className="block text-sm font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {categoriesMessages.editCard.name}
                </label>
                <input
                  id="cat-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-slug"
                  className="block text-sm font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {categoriesMessages.editCard.slug}
                </label>
                <input
                  id="cat-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="cat-description"
                  className="block text-sm font-medium text-[var(--ds-text-muted)] mb-1"
                >
                  {categoriesMessages.editCard.description}
                </label>
                <textarea
                  id="cat-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
              </div>
            </div>

            {saveMutation.isError && (
              <p className="text-red-500 text-sm mt-3">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : categoriesMessages.editCard.errorSaving}
              </p>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--ds-border-subtle)]">
              <button
                type="button"
                onClick={() => setClosing(true)}
                className="h-9 px-4 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm hover:border-[var(--ds-border-strong)] transition-colors"
              >
                {common.cancel}
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate({ form, image }, { onSuccess: onSaved })}
                disabled={!canSave}
                className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-40"
              >
                {saveMutation.isPending ? common.saving : common.save}
              </button>
            </div>
          </div>
        </div>
      </div>

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
