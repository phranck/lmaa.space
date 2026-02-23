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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm ${
              value.includes(cat.id)
                ? "border-amber-500 bg-amber-50 text-amber-800"
                : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
            }`}
          >
            <input
              type="checkbox"
              checked={value.includes(cat.id)}
              onChange={() => toggle(cat.id)}
              className="rounded accent-amber-600 shrink-0"
            />
            {cat.name}
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
