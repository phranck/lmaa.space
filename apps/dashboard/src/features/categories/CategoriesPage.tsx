import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@dein-shop/shared";
import { api } from "../../lib/api.ts";

interface CategoryForm {
  name: string;
  slug: string;
  icon: string;
  description: string;
}

const EMPTY_FORM: CategoryForm = { name: "", slug: "", icon: "", description: "" };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CategoriesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CategoryForm) =>
      editId
        ? api.patch(`/admin/categories/${editId}`, data)
        : api.post("/admin/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
      setForm(EMPTY_FORM);
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-admin"] });
      setDeleteId(null);
    },
  });

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: editId ? f.slug : slugify(name),
    }));
  }

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon ?? "",
      description: cat.description ?? "",
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const deleteTarget = categories.find((c) => c.id === deleteId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kategorien</h1>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {editId ? "Kategorie bearbeiten" : "Neue Kategorie"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="z.B. 🛒"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() =>
              saveMutation.mutate(form)
            }
            disabled={!form.name || !form.slug || saveMutation.isPending}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saveMutation.isPending ? "..." : editId ? "Speichern" : "Erstellen"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:border-gray-300 transition-colors"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && categories.length === 0 && (
        <p className="text-center py-12 text-gray-400">Noch keine Kategorien vorhanden.</p>
      )}

      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex items-center gap-3"
          >
            <span className="text-xl w-7 text-center">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-400">{cat.slug}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(cat)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(cat.id)}
                className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId !== null && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDeleteId(null)}
            aria-label="Abbrechen"
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Kategorie löschen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{deleteTarget.name}</span> wird dauerhaft gelöscht.
              Alle zugeordneten Shops verlieren ihre Kategorie.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
