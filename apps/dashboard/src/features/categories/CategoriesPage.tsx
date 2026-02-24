import { ConfirmDialog } from "@/components/ui/ConfirmDialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { CategoryEditCard } from "@/features/categories/CategoryEditCard.tsx";
import { CategoryGridItem } from "@/features/categories/CategoryGridItem.tsx";
import { CategoryTable } from "@/features/categories/CategoryTable.tsx";
import {
  useAdminCategories,
  useDeleteCategory,
} from "@/features/categories/hooks/useAdminCategories.ts";
import { useState } from "react";
import { SFListBullet, SFSquareGrid2x2Fill } from "sf-symbols-lib/monochrome";

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
        <SegmentedControl
          value={viewMode}
          onChange={changeViewMode}
          options={[
            { value: "list" as const, icon: <SFListBullet className="w-4 h-4" /> },
            { value: "grid" as const, icon: <SFSquareGrid2x2Fill className="w-4 h-4" /> },
          ]}
        />

        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-white rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
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
              className={`bg-[var(--ds-surface)] rounded-card border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-14"}`}
            />
          ))}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <p className="text-center py-12 text-[var(--ds-text-subtle)]">
          Noch keine Kategorien vorhanden.
        </p>
      )}

      {/* List View */}
      {!isLoading && viewMode === "list" && (
        <div className="-mx-6 -mt-6">
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

      <ConfirmDialog
        open={deleteId !== null && !!deleteTarget}
        title="Kategorie löschen?"
        description={
          <>
            <span className="font-medium">{deleteTarget?.name}</span> wird dauerhaft gelöscht. Alle
            zugeordneten Shops verlieren ihre Kategorie.
          </>
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteId !== null)
            deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
