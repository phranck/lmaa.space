import type { Category } from "@lmaa/shared";

interface CategoryMultiSelectProps {
  categories: Category[];
  value: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}

export function CategoryMultiSelect({
  categories,
  value,
  onChange,
  error,
}: CategoryMultiSelectProps) {
  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat) => (
          <label
            key={cat.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-control border cursor-pointer transition-colors text-sm ${
              value.includes(cat.id)
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-gray-900"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={value.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              className="rounded shrink-0"
            />
            {cat.name}
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
