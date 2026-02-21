import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AdminUser } from "@dein-shop/shared";
import { api } from "@/lib/api.ts";

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

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

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, needsSetup, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
