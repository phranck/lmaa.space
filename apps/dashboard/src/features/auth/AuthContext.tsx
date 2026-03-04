import { api } from "@/lib/api.ts";
import type { AdminUser } from "@lmaa/shared";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<AdminUser>("/admin/me");
      setUser(me);
      setNeedsSetup(false);
    } catch {
      setUser(null);
      try {
        const res = await api.get<{ needsSetup: boolean }>("/admin/setup");
        setNeedsSetup(res.needsSetup);
      } catch {
        setNeedsSetup(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const me = await api.post<AdminUser>("/admin/login", { username, password });
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/admin/logout").catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, isLoading, needsSetup, login, logout, refresh }),
    [user, isLoading, needsSetup, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
