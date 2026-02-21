import type { Shop, Category } from "@dein-shop/shared";

interface ShopListItemProps {
  shop: Shop;
  category?: Category;
  onEdit: (shop: Shop) => void;
  onDelete: (id: number) => void;
}

export function ShopListItem({ shop, category, onEdit, onDelete }: ShopListItemProps) {
  return (
    <div className="relative bg-white rounded-card border border-gray-200 p-3 flex items-center gap-3 card-hover">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">{shop.name}</p>
          {category && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {category.name}
            </span>
          )}
        </div>
        <a
          href={shop.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--color-primary)] hover:underline truncate block"
        >
          {shop.url}
        </a>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(shop)}
          className="btn-edit h-9 px-3 text-sm border border-gray-200 rounded-control text-gray-600 transition-colors"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => onDelete(shop.id)}
          className="btn-delete h-9 px-3 text-sm border border-red-200 rounded-control text-red-500 transition-colors"
        >
          Löschen
        </button>
      </div>
    </div>
  );
}
