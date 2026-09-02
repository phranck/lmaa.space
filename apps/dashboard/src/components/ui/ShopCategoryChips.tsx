import { Chip } from "@/components/ui/Chip.tsx";

/** One category, as little of it as a chip needs. */
type ShopCategoryChipItem = {
  /** Whatever the caller keys its list by, so a chip has a stable key. */
  id: number | string;
  /** What the chip reads. */
  name: string;
};

interface ShopCategoryChipsProps {
  /** The categories to name, in the order they should be read. */
  categories: ShopCategoryChipItem[];
  /**
   * What stands where a shop has no category at all.
   *
   * `null` renders nothing, which is what a detail view wants. A table cell
   * passes a dash instead, because an empty cell in a column of filled ones
   * reads as a rendering fault rather than as an answer.
   */
  emptyLabel?: string | null;
}

/**
 * The categories a shop is filed under, as chips.
 *
 * @param categories - The categories to name.
 * @param emptyLabel - What stands where there are none.
 * @returns A wrapping row of chips, or the empty label.
 */
export function ShopCategoryChips({ categories, emptyLabel = null }: ShopCategoryChipsProps) {
  if (categories.length === 0) {
    return emptyLabel === null ? null : (
      <span className="text-[var(--ds-text-subtle)]">{emptyLabel}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((category) => (
        <Chip key={category.id}>{category.name}</Chip>
      ))}
    </div>
  );
}
