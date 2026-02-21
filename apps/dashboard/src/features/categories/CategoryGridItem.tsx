import type { Category } from "@dein-shop/shared";

interface CategoryGridItemProps {
  category: Category;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function CategoryGridItem({ category, onEdit, onDelete }: CategoryGridItemProps) {
  return (
    <div className="relative bg-white rounded-card border border-gray-200 flex flex-col card-hover">
      <div className="aspect-[4/3] overflow-hidden rounded-t-[var(--radius-card)]">
        <img
          src={category.imageUrl ?? `/images/${category.slug}.jpg`}
          alt=""
          className="w-full h-full object-cover bg-gray-100"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg"; }}
        />
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="font-medium text-gray-900 text-sm truncate">{category.name}</p>
          {category.shopCount !== undefined && (
            <p className="text-xs text-gray-400">
              {category.shopCount} {category.shopCount === 1 ? "Shop" : "Shops"}
            </p>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(category.id)}
            className="btn-edit flex-1 py-1.5 text-xs border border-gray-200 rounded-control text-gray-600 transition-colors"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => onDelete(category.id)}
            className="btn-delete flex-1 py-1.5 text-xs border border-red-200 rounded-control text-red-500 transition-colors"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
