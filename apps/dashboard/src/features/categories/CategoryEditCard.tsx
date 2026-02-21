import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuTrash2, LuUpload, LuSearch } from "react-icons/lu";
import type { Category } from "@dein-shop/shared";
import { api } from "@/lib/api.ts";
import { UnsplashBrowser } from "@/features/categories/UnsplashBrowser.tsx";

interface CategoryEditCardProps {
  categoryId: number | "new";
  onClose: () => void;
  onSaved: () => void;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
}

interface ImageState {
  previewUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  pendingFile: File | null;
  pendingUnsplashUrl: string | null;
  deleted: boolean;
}

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

export function CategoryEditCard({ categoryId, onClose, onSaved }: CategoryEditCardProps) {
  const qc = useQueryClient();
  const isNew = categoryId === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
    enabled: !isNew,
  });

  const category = isNew ? undefined : categories.find((c) => c.id === categoryId);

  const [form, setForm] = useState<CategoryForm>({ name: "", slug: "", description: "" });
  const [image, setImage] = useState<ImageState>({
    previewUrl: null,
    photographer: null,
    photographerUrl: null,
    pendingFile: null,
    pendingUnsplashUrl: null,
    deleted: false,
  });
  const [imageLoadError, setImageLoadError] = useState(false);

  // Populate form when editing existing category
  useEffect(() => {
    if (category) {
      setForm({ name: category.name, slug: category.slug, description: category.description ?? "" });
      setImage({
        previewUrl: category.imageUrl ?? null,
        photographer: category.imagePhotographer ?? null,
        photographerUrl: category.imagePhotographerUrl ?? null,
        pendingFile: null,
        pendingUnsplashUrl: null,
        deleted: false,
      });
      setImageLoadError(false);
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

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      let saved: Category;

      // 1. Create or update base data
      if (isNew) {
        saved = await api.post<Category>("/admin/categories", data);
      } else {
        saved = await api.patch<Category>(`/admin/categories/${categoryId}`, data);
      }

      const id = saved.id;

      // 2. Handle image changes
      if (image.deleted && !image.pendingFile && !image.pendingUnsplashUrl) {
        await api.delete(`/admin/categories/${id}/image`);
      } else if (image.pendingFile) {
        const fd = new FormData();
        fd.append("image", image.pendingFile);
        await api.upload(`/admin/categories/${id}/image`, fd);
      } else if (image.pendingUnsplashUrl) {
        await api.patch(`/admin/categories/${id}`, {
          imageUrl: image.pendingUnsplashUrl,
          imagePhotographer: image.photographer,
          imagePhotographerUrl: image.photographerUrl,
        });
      }

      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
      onSaved();
    },
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
      deleted: false,
    });
    setImageLoadError(false);
  }

  function handleUnsplashSelect(imageUrl: string, photographer: string, photographerUrl: string) {
    setImage({
      previewUrl: imageUrl,
      photographer,
      photographerUrl,
      pendingFile: null,
      pendingUnsplashUrl: imageUrl,
      deleted: false,
    });
    setImageLoadError(false);
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
    });
    setImageLoadError(false);
  }

  // The image URL to show (preview takes priority, then existing, then slug fallback)
  const displayImageUrl = image.previewUrl
    ?? (image.deleted ? null : (category?.imageUrl ?? (category ? `/images/${category.slug}.jpg` : null)));

  const canSave = form.name.trim() && form.slug.trim() && !saveMutation.isPending;

  return (
    <>
      {/* Backdrop – fade in on mount, fade out on close */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 ${closing ? "overlay-backdrop-exit" : "overlay-backdrop-enter"}`}
        onAnimationEnd={(e) => { if (closing && e.target === e.currentTarget) onClose(); }}
      >
        <div className={`relative bg-white rounded-[var(--radius-card)] shadow-2xl w-full max-w-3xl grid grid-cols-2 overflow-hidden ${closing ? "overlay-card-exit" : "overlay-card-enter"}`}>

          {/* Image Panel – 50 % */}
          <div className="relative bg-gray-100 flex flex-col min-h-[420px]">
            {displayImageUrl && !imageLoadError ? (
              <img
                src={displayImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setImageLoadError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <LuSearch size={40} />
              </div>
            )}

            {/* Image action buttons */}
            <div className="absolute bottom-0 inset-x-0 p-3 flex flex-col gap-1.5 bg-gradient-to-t from-black/50 to-transparent">
              {displayImageUrl && !imageLoadError && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-white/90 hover:bg-white text-red-600 text-xs font-medium transition-colors w-full"
                >
                  <LuTrash2 size={12} />
                  Löschen
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-white/90 hover:bg-white text-gray-700 text-xs font-medium transition-colors w-full"
              >
                <LuUpload size={12} />
                Hochladen
              </button>
              <button
                type="button"
                onClick={() => setShowUnsplash(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-white/90 hover:bg-white text-gray-700 text-xs font-medium transition-colors w-full"
              >
                <span className="text-[10px] font-bold leading-none">U</span>
                Unsplash
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {isNew ? "Neue Kategorie" : "Kategorie bearbeiten"}
            </h2>

            <div className="flex flex-col gap-3 flex-1">
              <div>
                <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="cat-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="cat-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  id="cat-slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label htmlFor="cat-description" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  id="cat-description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
              </div>
            </div>

            {saveMutation.isError && (
              <p className="text-red-500 text-sm mt-3">
                {saveMutation.error instanceof Error ? saveMutation.error.message : "Fehler beim Speichern."}
              </p>
            )}

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setClosing(true)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-control text-sm hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(form)}
                disabled={!canSave}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saveMutation.isPending ? "Wird gespeichert…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showUnsplash && (
        <UnsplashBrowser
          initialQuery={form.name}
          onSelect={handleUnsplashSelect}
          onClose={() => setShowUnsplash(false)}
        />
      )}
    </>
  );
}
