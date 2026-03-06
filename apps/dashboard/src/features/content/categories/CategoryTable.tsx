import { useMemo } from "react";
import SFLongTextPageAndPencilFill from "sf-symbols-lib/monochrome/SFLongTextPageAndPencilFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";

import type { Category } from "@lmaa/shared";

import { type ColumnDef, DataTable } from "@/components/ui/Table.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
}

function CategoryThumb({ category }: { category: Category }) {
  const src = category.imageUrl ?? `/images/${category.slug}.jpg`;
  return (
    <div className="w-28 h-[63px] rounded-lg overflow-hidden bg-[var(--ds-bg-elevated)] shrink-0">
      <img
        src={src}
        alt=""
        loading="lazy"
        className="block w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
        }}
      />
    </div>
  );
}

/**
 * Table variant for category administration.
 *
 * @param props - Category rows and action handlers.
 * @returns Sticky-header data table.
 */
export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  const { messages } = useI18n();
  const categoriesMessages = messages.categories;
  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        id: "image",
        className: "w-32",
        cell: (cat) => <CategoryThumb category={cat} />,
      },
      {
        id: "name",
        header: categoriesMessages.table.name,
        sortKey: (cat) => cat.name.toLowerCase(),
        cell: (cat) => <span className="font-medium text-[var(--ds-text)]">{cat.name}</span>,
      },
      {
        id: "slug",
        header: categoriesMessages.table.slug,
        sortKey: (cat) => cat.slug,
        cell: (cat) => <span className="font-mono text-[var(--ds-text-subtle)]">{cat.slug}</span>,
      },
      {
        id: "shopCount",
        header: categoriesMessages.table.shops,
        className: "w-20",
        sortKey: (cat) => cat.shopCount ?? 0,
        cell: (cat) => <span className="text-[var(--ds-text-muted)]">{cat.shopCount ?? "–"}</span>,
      },
      {
        id: "actions",
        className: "w-48",
        cell: (cat) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => onEdit(cat.id)}
              className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] text-sm hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
            >
              <SFLongTextPageAndPencilFill className="w-3.5 h-3.5" />
              {categoriesMessages.table.edit}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(cat.id)}
                className="h-9 px-3 flex items-center gap-2 border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] text-sm hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
              >
                <SFTrashFill className="w-3.5 h-3.5" />
                {categoriesMessages.table.delete}
              </button>
            )}
          </div>
        ),
      },
    ],
    [categoriesMessages, onDelete, onEdit],
  );

  return <DataTable columns={columns} data={categories} getRowKey={(c) => c.id} stickyHeader />;
}
