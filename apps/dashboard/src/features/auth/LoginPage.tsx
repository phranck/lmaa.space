import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useState } from "react";
import { useNavigate } from "react-router";

export function LoginPage() {
  const { messages } = useI18n();
  const loginMessages = messages.auth.login;
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get("username") as string, fd.get("password") as string);
      navigate("/");
    } catch {
      setError(loginMessages.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            role="img"
            aria-label={messages.auth.logoAlt}
            style={{
              width: 120,
              height: 120,
              backgroundColor: "var(--color-primary)",
              WebkitMaskImage: "url(/logo.png)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskImage: "url(/logo.png)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "center",
            }}
            className="mx-auto"
          />
          <p className="text-sm text-[var(--ds-text-muted)] mt-1">{messages.auth.adminArea}</p>
        </div>

        <div className="bg-[var(--ds-surface)] rounded-2xl shadow-sm border border-[var(--ds-border-subtle)] p-5">
          <h2 className="text-lg font-semibold text-[var(--ds-text)] mb-6 text-center">
            {loginMessages.title}
          </h2>

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
                autoComplete="username"
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
                autoComplete="current-password"
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
                {loading ? loginMessages.submitLoading : loginMessages.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
