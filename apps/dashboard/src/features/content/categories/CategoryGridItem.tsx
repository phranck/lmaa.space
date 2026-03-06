import SFLongTextPageAndPencilFill from "sf-symbols-lib/monochrome/SFLongTextPageAndPencilFill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";

import type { Category } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";

interface CategoryGridItemProps {
  category: Category;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
}

/**
 * Grid card variant for one category item.
 *
 * @param props - Category data and row-level actions.
 * @returns Visual category card.
 */
export function CategoryGridItem({ category, onEdit, onDelete }: CategoryGridItemProps) {
  const { messages } = useI18n();
  const categoriesMessages = messages.categories;

  return (
    <div className="relative bg-[var(--ds-surface)] rounded-card border border-[var(--ds-border)] flex flex-col card-hover">
      <div className="aspect-[4/3] overflow-hidden rounded-t-[var(--radius-card)]">
        <img
          src={category.imageUrl ?? `/images/${category.slug}.jpg`}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover bg-[var(--ds-bg-elevated)]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
          }}
        />
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="font-medium text-[var(--ds-text)] text-sm truncate">{category.name}</p>
          {category.shopCount !== undefined && (
            <p className="text-xs text-[var(--ds-text-subtle)]">
              {category.shopCount}{" "}
              {category.shopCount === 1
                ? categoriesMessages.card.shopSingular
                : categoriesMessages.card.shopPlural}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(category.id)}
            className="btn-edit flex-1 py-1.5 text-xs border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors flex items-center gap-1 justify-center"
          >
            <SFLongTextPageAndPencilFill className="w-3 h-3" />
            {categoriesMessages.card.edit}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(category.id)}
              className="btn-delete flex-1 py-1.5 text-xs border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors flex items-center gap-1 justify-center"
            >
              <SFTrashFill className="w-3 h-3" />
              {categoriesMessages.card.delete}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
