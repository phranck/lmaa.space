import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  EMPTY_CREATE_USER_FORM,
  useAdminUsers,
  useCreateUser,
  useDeleteUser,
} from "@/features/users/hooks/useAdminUsers.ts";
import type { CreateUserFormData } from "@/features/users/hooks/useAdminUsers.ts";
import { useState } from "react";

export function UsersPage() {
  const { user: me } = useAuth();
  const [form, setForm] = useState<CreateUserFormData>(EMPTY_CREATE_USER_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: users = [], isLoading } = useAdminUsers();
  const createMutation = useCreateUser();
  const deleteMutation = useDeleteUser();

  const deleteTarget = users.find((u) => u.id === deleteId);

  return (
    <div>
      <PageHeader title="Benutzer">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Abbrechen" : "+ Benutzer einladen"}
        </button>
      </PageHeader>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Neuen Admin-Benutzer anlegen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="new-username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Benutzername
              </label>
              <input
                id="new-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                minLength={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Temporäres Passwort
              </label>
              <input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-control text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() =>
                createMutation.mutate(form, {
                  onSuccess: () => {
                    setForm(EMPTY_CREATE_USER_FORM);
                    setShowForm(false);
                  },
                })
              }
              disabled={!form.username || !form.email || !form.password || createMutation.isPending}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-control text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {createMutation.isPending ? "Wird erstellt..." : "Benutzer erstellen"}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-500 text-sm mt-2">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Fehler beim Erstellen."}
            </p>
          )}
        </div>
      )}

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => `sk-${i}`).map((key) => (
            <div
              key={key}
              className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900">{user.username}</p>
                {user.isOwner && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Owner
                  </span>
                )}
                {user.id === me?.id && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    Du
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            {!user.isOwner && user.id !== me?.id && (
              <button
                type="button"
                onClick={() => setDeleteId(user.id)}
                className="px-3 py-1.5 text-sm border border-red-200 rounded-control text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                Entfernen
              </button>
            )}
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
            <h3 className="font-bold text-gray-900 mb-2">Benutzer entfernen?</h3>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium">{deleteTarget.username}</span> verliert den
              Admin-Zugang. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-control text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-control text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "..." : "Entfernen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
