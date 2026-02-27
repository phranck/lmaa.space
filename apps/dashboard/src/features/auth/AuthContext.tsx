import { api } from "@/lib/api.ts";
import type { AdminUser } from "@lmaa/shared";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Authentication provider for dashboard session state.
 *
 * Hidden behavior: on mount it probes `/admin/me`; on failure it falls back to
 * `/admin/setup` to decide whether first-time setup is required.
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  async function refresh() {
    try {
      const me = await api.get<AdminUser>("/admin/me");
      setUser(me);
      setNeedsSetup(false);
    } catch {
      setUser(null);
      try {
        const { needsSetup } = await api.get<{ needsSetup: boolean }>("/admin/setup");
        setNeedsSetup(needsSetup);
      } catch {
        setNeedsSetup(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const me = await api.post<AdminUser>("/admin/login", { username, password });
    setUser(me);
  }

  async function logout() {
    await api.post("/admin/logout").catch(() => {});
    setUser(null);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only fetch
  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, needsSetup, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Accessor hook for auth/session actions.
 *
 * @returns Auth state and mutation methods.
 * @throws Error when used outside `AuthProvider`.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
