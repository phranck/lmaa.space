import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { CategoryEditCard } from "@/features/categories/CategoryEditCard.tsx";
import { CategoryGridItem } from "@/features/categories/CategoryGridItem.tsx";
import { CategoryTable } from "@/features/categories/CategoryTable.tsx";
import {
  useAdminCategories,
  useDeleteCategory,
} from "@/features/categories/hooks/useAdminCategories.ts";
import { useState } from "react";
import { LuLayoutGrid, LuList } from "react-icons/lu";

type ViewMode = "list" | "grid";

export function CategoriesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem("categories-view") as ViewMode) ?? "list",
  );
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("categories-view", mode);
  }

  const { data: categories = [], isLoading } = useAdminCategories();
  const deleteMutation = useDeleteCategory();

  const deleteTarget = categories.find((c) => c.id === deleteId);

  return (
    <div>
      <PageHeader title="Kategorien">
        {/* View toggle */}
        <div className="flex h-9 rounded-control border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => changeViewMode("list")}
            className={`flex items-center px-3 transition-colors ${
              viewMode === "list"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            aria-label="Listenansicht"
          >
            <LuList size={16} />
          </button>
          <button
            type="button"
            onClick={() => changeViewMode("grid")}
            className={`flex items-center px-3 transition-colors ${
              viewMode === "grid"
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            aria-label="Kachelansicht"
          >
            <LuLayoutGrid size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="h-9 px-4 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Neue Kategorie
        </button>
      </PageHeader>

      {/* Loading skeletons */}
      {isLoading && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-2"
          }
        >
          {Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className={`bg-white rounded-card border border-gray-100 animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-14"}`}
            />
          ))}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <p className="text-center py-12 text-gray-400">Noch keine Kategorien vorhanden.</p>
      )}

      {/* List View */}
      {!isLoading && viewMode === "list" && (
        <div className="-mx-6">
          <CategoryTable categories={categories} onEdit={setEditTarget} onDelete={setDeleteId} />
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <CategoryGridItem
              key={cat.id}
              category={cat}
              onEdit={setEditTarget}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      {/* Edit / New Category Overlay */}
      {editTarget !== null && (
        <CategoryEditCard
          categoryId={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteId !== null && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteId(null)}
            aria-label="Abbrechen"
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Kategorie löschen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{deleteTarget.name}</span> wird dauerhaft gelöscht. Alle
              zugeordneten Shops verlieren ihre Kategorie.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-control text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
                }
                className="flex-1 py-2.5 bg-red-500 text-white rounded-control text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
