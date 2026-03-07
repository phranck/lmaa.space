type ShopCategoryBadgeItem = {
  id: number | string;
  name: string;
};

interface ShopCategoryBadgesProps {
  categories: ShopCategoryBadgeItem[];
  emptyLabel?: string | null;
}

export function ShopCategoryBadges({
  categories,
  emptyLabel = null,
}: ShopCategoryBadgesProps) {
  if (categories.length === 0) {
    return emptyLabel === null ? null : <span className="text-[var(--ds-text-subtle)]">{emptyLabel}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <span
          key={category.id}
          className="px-2 py-0.5 rounded-full bg-[color-mix(in_oklab,var(--ds-surface-hover)_65%,var(--ds-border)_35%)] text-[var(--ds-text-muted)] text-xs"
        >
          {category.name}
        </span>
      ))}
    </div>
  );
}
