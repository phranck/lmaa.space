import { Badge } from "@/components/ui/Badge.tsx";

type ShopCategoryBadgeItem = {
  id: number | string;
  name: string;
};

interface ShopCategoryBadgesProps {
  categories: ShopCategoryBadgeItem[];
  emptyLabel?: string | null;
}

export function ShopCategoryBadges({ categories, emptyLabel = null }: ShopCategoryBadgesProps) {
  if (categories.length === 0) {
    return emptyLabel === null ? null : (
      <span className="text-[var(--ds-text-subtle)]">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <Badge
          key={category.id}
          colorClass="bg-[color-mix(in_oklab,var(--ds-surface-hover)_65%,var(--ds-border)_35%)] text-[var(--ds-text-muted)]"
        >
          {category.name}
        </Badge>
      ))}
    </div>
  );
}
