import type { Category } from "@lmaa/shared";

function CategoryImage({ category }: { category: Category }) {
  const src = category.imageUrl ?? `/images/${category.slug}.jpg`;
  return (
    <img
      src={src}
      alt=""
      className="w-24 h-full object-cover shrink-0 bg-[var(--ds-bg-elevated)] rounded-l-[var(--radius-card)]"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
      }}
    />
  );
}

interface CategoryListItemProps {
  category: Category;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function CategoryListItem({ category, onEdit, onDelete }: CategoryListItemProps) {
  return (
    <div className="relative bg-[var(--ds-surface)] rounded-card border border-[var(--ds-border)] flex items-stretch card-hover">
      <CategoryImage category={category} />
      <div className="flex-1 min-w-0 flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--ds-text)]">{category.name}</p>
          <p className="text-xs text-[var(--ds-text-subtle)]">
            {category.slug}
            {category.shopCount !== undefined && ` · ${category.shopCount} Shops`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(category.id)}
            className="btn-edit h-9 px-3 text-sm border border-[var(--ds-btn-neutral-border)] rounded-control text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="btn-delete h-9 px-3 text-sm border border-[var(--ds-btn-danger-border)] rounded-control text-[var(--ds-btn-danger-text)] hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
