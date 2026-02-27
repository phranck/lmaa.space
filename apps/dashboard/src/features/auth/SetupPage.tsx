import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { api } from "@/lib/api.ts";
import { useState } from "react";
import { useNavigate } from "react-router";

/**
 * First-run setup screen that creates the initial owner account.
 *
 * @returns Setup form page.
 */
export function SetupPage() {
  const { messages } = useI18n();
  const loginMessages = messages.auth.login;
  const setupMessages = messages.auth.setup;
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
      setError(setupMessages.passwordMismatch);
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
      setError(err instanceof Error ? err.message : setupMessages.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt={messages.auth.logoAlt}
            style={{ width: 120, height: 120 }}
            className="mx-auto"
          />
          <p className="text-sm text-[var(--ds-text-muted)] mt-1">{setupMessages.welcome}</p>
        </div>

        <div className="bg-[var(--ds-surface)] rounded-2xl shadow-sm border border-[var(--ds-border-subtle)] p-8">
          <h2 className="text-lg font-semibold text-[var(--ds-text)] mb-2">
            {setupMessages.title}
          </h2>
          <p className="text-sm text-[var(--ds-text-muted)] mb-6">{setupMessages.subtitle}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {loginMessages.username}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                className="w-full px-4 py-2.5 rounded-control border border-[var(--ds-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {setupMessages.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-2.5 rounded-control border border-[var(--ds-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {loginMessages.password}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-2.5 rounded-control border border-[var(--ds-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {setupMessages.confirmPassword}
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                className="w-full px-4 py-2.5 rounded-control border border-[var(--ds-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-control font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-60"
              >
                {loading ? setupMessages.submitLoading : setupMessages.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
