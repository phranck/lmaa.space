import type { Category } from "@dein-shop/shared";

function CategoryImage({ category }: { category: Category }) {
  const src = category.imageUrl ?? `/images/${category.slug}.jpg`;
  return (
    <img
      src={src}
      alt=""
      className="w-24 h-full object-cover shrink-0 bg-gray-100 rounded-l-[var(--radius-card)]"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg"; }}
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
    <div className="relative bg-white rounded-card border border-gray-200 flex items-stretch card-hover">
      <CategoryImage category={category} />
      <div className="flex-1 min-w-0 flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{category.name}</p>
          <p className="text-xs text-gray-400">
            {category.slug}
            {category.shopCount !== undefined && ` · ${category.shopCount} Shops`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(category.id)}
            className="btn-edit h-9 px-3 text-sm border border-gray-200 rounded-control text-gray-600 transition-colors"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="btn-delete h-9 px-3 text-sm border border-red-200 rounded-control text-red-500 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
