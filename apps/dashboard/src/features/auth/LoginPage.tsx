import { useI18n } from "@/context/I18nContext.tsx";
import { AuthBackground } from "@/features/auth/AuthBackground.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

/**
 * Detects browser/1Password autofill via CSS animation and replaces the
 * affected inputs with fresh DOM elements to clear the :autofill pseudo-class.
 * After the first swap, `data-1p-ignore` is set to prevent re-filling.
 */
function useAutofillSwap(ids: string[], setters: Record<string, (v: string) => void>) {
  const [inputKey, setInputKey] = useState(0);
  const [ignore, setIgnore] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handled = useRef(false);

  useEffect(() => {
    function onAnimationStart(e: AnimationEvent) {
      if (e.animationName !== "on-autofill" || handled.current) return;
      const input = e.target as HTMLInputElement;
      if (!ids.includes(input.id)) return;

      handled.current = true;

      // Sync filled values to React state
      for (const id of ids) {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) setters[id]?.(el.value);
      }

      // Hide card, swap inputs, prevent 1Password re-fill
      if (wrapRef.current) wrapRef.current.style.opacity = "0";
      setIgnore(true);
      setInputKey((k) => k + 1);
    }

    document.addEventListener("animationstart", onAnimationStart);
    return () => document.removeEventListener("animationstart", onAnimationStart);
  }, [ids, setters]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: inputKey triggers re-show after autofill swap
  useLayoutEffect(() => {
    if (wrapRef.current) wrapRef.current.style.opacity = "1";
  }, [inputKey]);

  return { inputKey, ignore, wrapRef };
}

const FIELD_IDS = ["username", "password"];

/**
 * Login screen for existing dashboard users.
 *
 * @returns Login form page.
 */
export function LoginPage() {
  const { messages } = useI18n();
  const loginMessages = messages.auth.login;
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setters = useRef<Record<string, (v: string) => void>>({
    username: setUsername,
    password: setPassword,
  }).current;

  const { inputKey, ignore, wrapRef } = useAutofillSwap(FIELD_IDS, setters);

  async function handleLogin() {
    if (!username || !password) return;
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError(loginMessages.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleLogin();
  }

  const inputClassName =
    "w-full h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

  return (
    <AuthBackground>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="relative mx-auto w-[120px] h-[120px]">
            <div className="absolute inset-0 rounded-full animate-[auth-glow_8s_ease-in-out_infinite] bg-[var(--color-primary)]" />
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
              className="relative"
            />
          </div>
        </div>

        <div
          ref={wrapRef}
          className="bg-[var(--ds-surface)] rounded-[var(--radius-card)] shadow-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
        >
          <div className="bg-[var(--ds-surface-inset)] border-b border-[var(--ds-border-subtle)] px-5 py-4">
            <h2 className="font-bold text-[var(--ds-text)]">{loginMessages.title}</h2>
          </div>

          <div key={inputKey} className="px-5 py-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
              >
                {loginMessages.username}
              </label>
              <input
                id="username"
                type="text"
                autoComplete="off"
                data-1p-ignore={ignore || undefined}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClassName}
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
                type="password"
                autoComplete="off"
                data-1p-ignore={ignore || undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className={inputClassName}
              />
            </div>

            {error && (
              <p role="alert" className="text-red-500 text-sm">
                {error}
              </p>
            )}
          </div>

          <div className="bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border-subtle)] px-5 py-4 flex justify-end">
            <button
              type="button"
              disabled={loading || !username || !password}
              onClick={handleLogin}
              className="h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60"
            >
              {loading ? loginMessages.submitLoading : loginMessages.submit}
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
