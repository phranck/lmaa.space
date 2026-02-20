import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Shop, Category } from "@dein-shop/shared";
import { api } from "../../lib/api.ts";

interface ShopForm {
  name: string;
  url: string;
  description: string;
  categoryId: string;
  region: string;
  shipping: string;
}

const EMPTY_FORM: ShopForm = {
  name: "",
  url: "",
  description: "",
  categoryId: "",
  region: "",
  shipping: "",
};

export function ShopsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ShopForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["shops-admin"],
    queryFn: () => api.get<Shop[]>("/admin/shops"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: () => api.get<Category[]>("/admin/categories"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: ShopForm) => {
      const body = {
        ...data,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
      };
      return editId
        ? api.patch(`/admin/shops/${editId}`, body)
        : api.post("/admin/shops", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      setForm(EMPTY_FORM);
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/shops/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shops-admin"] });
      setDeleteId(null);
    },
  });

  function startEdit(shop: Shop) {
    setEditId(shop.id);
    setForm({
      name: shop.name,
      url: shop.url,
      description: shop.description ?? "",
      categoryId: shop.categoryId ? String(shop.categoryId) : "",
      region: shop.region ?? "",
      shipping: shop.shipping ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const filtered = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteTarget = shops.find((s) => s.id === deleteId);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shops</h1>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {editId ? "Shop bearbeiten" : "Neuer Shop"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Keine</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="z.B. Deutschland, EU"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Versand</label>
            <input
              type="text"
              value={form.shipping}
              onChange={(e) => setForm((f) => ({ ...f, shipping: e.target.value }))}
              placeholder="z.B. Kostenlos ab 50 €"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.name || !form.url || saveMutation.isPending}
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

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Shops filtern..."
          className="w-full sm:w-72 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="text-center py-12 text-gray-400">
          {shops.length === 0 ? "Noch keine Shops vorhanden." : "Keine Treffer."}
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((shop) => {
          const cat = categories.find((c) => c.id === shop.categoryId);
          return (
            <div
              key={shop.id}
              className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900">{shop.name}</p>
                  {cat && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {cat.icon} {cat.name}
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
                  onClick={() => startEdit(shop)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition-colors"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(shop.id)}
                  className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          );
        })}
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
            <h3 className="font-bold text-gray-900 mb-2">Shop löschen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{deleteTarget.name}</span> wird dauerhaft entfernt.
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
