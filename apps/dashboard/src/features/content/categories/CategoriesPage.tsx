import {
  PlusCircleIcon,
  TagIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { CategoryEditCard } from "@/features/content/categories/CategoryEditCard.tsx";
import { CategoryGridItem } from "@/features/content/categories/CategoryGridItem.tsx";
import {
  useAdminCategories,
  useDeleteCategory,
} from "@/features/content/hooks/useAdminCategories.ts";

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
  const [editTarget, setEditTarget] = useState<number | "new" | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useAdminCategories();
  const deleteMutation = useDeleteCategory();

  const deleteTarget = categories.find((c) => c.id === deleteId);

  return (
    <PageLayout>
      <PageHeader title={categoriesMessages.title}>
        <button
          type="button"
          onClick={() => setEditTarget("new")}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)]"
        >
          <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
          {categoriesMessages.newCategory}
        </button>
      </PageHeader>

      <PageBody>
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }, (_, i) => `sk-${i}`).map((key) => (
              <div
                key={key}
                className="bg-[var(--ds-surface)] rounded-2xl border border-[var(--ds-border-subtle)] animate-pulse aspect-video"
              />
            ))}
          </div>
        )}

        {!isLoading && categories.length === 0 && (
          <ContentUnavailableView
            chromeless
            icon={<TagIcon weight="duotone" aria-hidden />}
            title={categoriesMessages.empty}
            subtitle={categoriesMessages.emptyHint}
            className="flex-1 min-h-0"
          />
        )}

        {!isLoading && categories.length > 0 && (
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
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
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
