import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { api } from "@/lib/api.ts";

export function SetupPage() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    if (fd.get("password") !== fd.get("passwordConfirm")) {
      setError("Passwörter stimmen nicht überein.");
      setLoading(false);
      return;
    }

    try {
      await api.post("/admin/setup", {
        username: fd.get("username"),
        email: fd.get("email"),
        password: fd.get("password"),
      });
      await refresh();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Setup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">dein.shop</h1>
          <p className="text-sm text-gray-500 mt-1">Willkommen!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin einrichten</h2>
          <p className="text-sm text-gray-500 mb-6">
            Erstelle den ersten Admin-Account für dein.shop.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Benutzername
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                className="w-full px-4 py-2.5 rounded-control border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-control border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-control border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                Passwort bestätigen
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-control border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-control font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-60"
              >
                {loading ? "Wird eingerichtet..." : "Admin-Account erstellen"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
