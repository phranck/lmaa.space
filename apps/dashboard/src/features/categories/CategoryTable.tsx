import type { Category } from "@lmaa/shared";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

function CategoryThumb({ category }: { category: Category }) {
  const src = category.imageUrl ?? `/images/${category.slug}.jpg`;
  return (
    <img
      src={src}
      alt=""
      className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = "/images/allgemein.jpg";
      }}
    />
  );
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  return (
    <div className="w-full rounded-card border border-gray-200 overflow-hidden">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="w-14 px-4 py-2.5" />
            <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600">
              Name
            </th>
            <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600">
              Slug
            </th>
            <th className="w-20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600">
              Shops
            </th>
            <th className="w-48 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {categories.map((cat) => (
            <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2">
                <CategoryThumb category={cat} />
              </td>
              <td className="px-4 py-2 font-medium text-gray-900">{cat.name}</td>
              <td className="px-4 py-2 font-mono text-gray-400">{cat.slug}</td>
              <td className="px-4 py-2 text-gray-500">{cat.shopCount ?? "–"}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(cat.id)}
                    className="h-8 px-3 border border-gray-200 rounded-control text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(cat.id)}
                    className="h-8 px-3 border border-red-200 rounded-control text-red-500 hover:border-red-300 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
