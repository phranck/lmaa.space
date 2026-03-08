import { useState } from "react";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";
import SFSquareGrid2x2Fill from "sf-symbols-lib/monochrome/SFSquareGrid2x2Fill";
import SFTagFill from "sf-symbols-lib/monochrome/SFTagFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { CategoryEditCard } from "@/features/content/categories/CategoryEditCard.tsx";
import { CategoryGridItem } from "@/features/content/categories/CategoryGridItem.tsx";
import { CategoryTable } from "@/features/content/categories/CategoryTable.tsx";
import {
  useAdminCategories,
  useDeleteCategory,
} from "@/features/content/hooks/useAdminCategories.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type ViewMode = "list" | "grid";

/**
 * Category management page with list/grid toggle and CRUD actions.
 *
 * @returns Category administration screen.
 */
export function CategoriesPage() {
  const { messages } = useI18n();
  const categoriesMessages = messages.categories;
  const common = messages.common;
  const { user: me } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useAdminCategories();
  const deleteMutation = useDeleteCategory();

  const deleteTarget = categories.find((c) => c.id === deleteId);

  return (
    <PageLayout>
      <PageHeader title={categoriesMessages.title}>
        <SegmentedControl
          value={viewMode}
          onChange={setViewMode}
          storageKey={getSegmentedStorageKey(me?.id, "categories:view")}
          options={[
            { value: "list" as const, icon: <SFListBullet className="w-4 h-4" /> },
            { value: "grid" as const, icon: <SFSquareGrid2x2Fill className="w-4 h-4" /> },
          ]}
        />

        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors"
        >
          <SFPlusCircleFill className="w-3.5 h-3.5" />
          {categoriesMessages.newCategory}
        </button>
      </PageHeader>

      <PageBody>
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
          <ContentUnavailableView
            icon={<SFTagFill aria-hidden />}
            title={categoriesMessages.empty}
            subtitle={categoriesMessages.emptyHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && categories.length > 0 && viewMode === "list" && (
          <div className="-mx-3 -mt-3">
            <CategoryTable
              categories={categories}
              onEdit={setEditTarget}
              onDelete={me?.role !== "moderator" ? setDeleteId : undefined}
            />
          </div>
        )}

        {!isLoading && categories.length > 0 && viewMode === "grid" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <CategoryGridItem
                key={cat.id}
                category={cat}
                onEdit={setEditTarget}
                onDelete={me?.role !== "moderator" ? setDeleteId : undefined}
              />
            ))}
          </div>
        )}
      </PageBody>

      {/* Edit / New Category Overlay */}
      {editTarget !== null && (
        <CategoryEditCard
          categoryId={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      <Dialog
        open={deleteId !== null && !!deleteTarget}
        title={categoriesMessages.deleteTitle}
        titleIcon={<SFTrashFill className={dialogHeaderIconClass} />}
        onClose={() => setDeleteId(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteTarget?.name}</span>{" "}
            {categoriesMessages.deleteDescriptionSuffix}
          </p>
        </div>
        <Dialog.Footer>
          <button type="button" onClick={() => setDeleteId(null)} className={dialogBtnSecondary}>
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (deleteId !== null)
                deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
            }}
            className={dialogBtnDestructive}
          >
            {deleteMutation.isPending ? "…" : common.delete}
          </button>
        </Dialog.Footer>
      </Dialog>
    </PageLayout>
  );
}
